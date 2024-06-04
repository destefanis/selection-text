figma.showUI(__html__, { width: 240, height: 400 });
figma.skipInvisibleInstanceChildren = true;

let localTextStyles = {};
let selectAllUsed = false;

figma.on("selectionchange", _event => {
  // When a change happens in the document
  // send a message to the plugin to look for changes.
  if (selectAllUsed === false) {
    figma.ui.postMessage({
      type: "change"
    });
  }
});


figma.ui.onmessage = async (msg) => {

  if (msg.type === 'resize') {
    figma.ui.resize(msg.width, msg.height);
  }

  // Called immediately by the App to fetch local styles.
  // That way we have them to reference later.
  if (msg.type === "getLocalTextStyles") {
    async function sendLocalTextStylesToUI() {
      // Fetch text styles asynchronously
      const textStyles = await figma.getLocalTextStylesAsync();

      // Prepare and send the styles in a detailed but simplified format
      const detailedStyles = textStyles.map(style => ({
        id: style.id,
        name: style.name,
        fontFamily: style.fontName.family,
        fontWeight: style.fontName.style,
        description: style.description || "No description", // Handle potentially undefined properties
        fontSize: style.fontSize || "Variable", // Handle cases where fontSize might not be uniformly set
        // lineHeight: style.lineHeight ? (style.lineHeight.unit === 'PIXELS' ? style.lineHeight.value : style.lineHeight.unit) : 'AUTO',
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing ? (style.letterSpacing.unit === 'PIXELS' ? style.letterSpacing.value : style.letterSpacing.unit) : 'NORMAL',
        // letterSpacing: style.letterSpacing,
        paragraphSpacing: style.paragraphSpacing || 0,
        textCase: style.textCase || 'ORIGINAL',
        textDecoration: style.textDecoration || 'NONE',
        textAlignHorizontal: style.textAlignHorizontal || 'LEFT',
        textAlignVertical: style.textAlignVertical || 'TOP',
      }));

      localTextStyles = detailedStyles;

      figma.ui.postMessage({
        type: 'returnLocalTextStyles',
        data: detailedStyles
      });
    }

    // Call the function to execute
    sendLocalTextStylesToUI();
  }

  // When the user hits the button we run this
  // to get all the layers in a selection
  if (msg.type === 'getSelectedTextLayers') {
    
    if (msg.button === "all") {
      const allNodes = figma.currentPage.findAll();
      figma.currentPage.selection = allNodes;
    }

    if (figma.currentPage.selection.length > 0) {
      const selection = figma.currentPage.selection;

      // Async generator function to find text layers in the selection
      async function* findTextLayers(selection) {
        let textLayers = [];

        // Recursive function to check each node and its children for text layers
        async function checkNode(node) {
          if (node.type === "TEXT") {

            let fontWeight = node.fontWeight;
            let fontSize = node.fontSize;
            let fontName = node.fontName;

            // Check if fontWeight is a symbol, which means it could
            // be using multiple font weights
            if (typeof fontWeight === 'symbol') {
              fontWeight = "Mixed weights";
            } else {
              fontWeight = node.fontName.style;
            }

            // Check if fontWeight is a symbol, which means it could
            // be using multiple font sizes
            if (typeof fontSize === 'symbol') {
              fontSize = "Mixed sizes";
            } else {
              fontSize = Math.floor(node.fontSize * 10) / 10;
            }

            // Check if fontWeight is a symbol which means
            // it could be using multiple fonts in the same text layer.
            if (typeof fontName === 'symbol') {
              fontName = "Multiple fonts";
            } else {
              fontName = node.fontName.family;
            }

            // If the node is using a variable for the font family
            // it will normally be undefined, so lets check
            if (node.boundVariables && node.boundVariables.fontFamily) {
              textLayers.push({
                id: node.id,
                name: node.name,
                text: node.characters,
                fontFamily: "Variable",
                fontWeight: fontWeight,
                fontSize: fontSize,
                lineHeight: (node.lineHeight && node.lineHeight.value) || "Auto",
                letterSpacing: node.letterSpacing,
                paragraphSpacing: node.paragraphSpacing,
                textAlign: node.textAlignHorizontal,
                verticalAlign: node.textAlignVertical,
                width: node.width,
                height: node.height,
                textStyleId: node.textStyleId,
                boundVariables: node.boundVariables.fontFamily.map(v => v.id).join(', '),
                textCase: node.textCase,
                textDecoration: node.textDecoration,
                hangingList: node.hangingList,
                hangingPunctuation: node.hangingPunctuation,
                paragraphIndent: node.paragraphIndent,
                openTypeFeatures: typeof node.openTypeFeatures === 'object' && !Array.isArray(node.openTypeFeatures) && node.openTypeFeatures !== null ? node.openTypeFeatures : {},
              });
            } else {
              textLayers.push({
                id: node.id,
                name: node.name,
                text: node.characters,
                fontFamily: fontName,
                fontWeight: fontWeight,
                fontSize: fontSize,
                lineHeight: (node.lineHeight && node.lineHeight.value) || "Auto",
                letterSpacing: node.letterSpacing,
                paragraphSpacing: node.paragraphSpacing,
                textAlign: node.textAlignHorizontal,
                verticalAlign: node.textAlignVertical,
                width: node.width,
                height: node.height,
                textStyleId: node.textStyleId,
                boundVariables: undefined,
                textCase: node.textCase,
                textDecoration: node.textDecoration,
                hangingList: node.hangingList,
                hangingPunctuation: node.hangingPunctuation,
                paragraphIndent: node.paragraphIndent,
                // OpenType features can be symbol so we need to check for that
                openTypeFeatures: typeof node.openTypeFeatures === 'object' && !Array.isArray(node.openTypeFeatures) && node.openTypeFeatures !== null ? node.openTypeFeatures : {},
              });
            }

          } else if ("children" in node) {
            for (const child of node.children) {
              await checkNode(child);
            }
          }
        }

        // Loop through each node in the selection
        for (let i = 0; i < selection.length; i++) {
          await checkNode(selection[i]);
          if (i % 10 === 9) { // Yield every 10 nodes processed
            yield;
          }
        }

        // Return all collected text layers when done
        return textLayers;
      }

      // Instantiate the async generator
      const generator = findTextLayers(selection);
      const allTextLayers = [];

      // Function to exhaust the async generator and collect text layers
      async function processTextLayers() {
        let result;
        do {
          result = await generator.next();
          // Check if result.value is an array before pushing its contents
          if (Array.isArray(result.value)) {
            allTextLayers.push(...result.value);
          }
        } while (!result.done);

        groupAndSendData(allTextLayers);
      }

      await processTextLayers();

      // Format the line height depending if it's a percentage, pixels, or set to auto.
      // This is only used by styles.
      function formatStyleLineHeight(lineHeight) {
        if (lineHeight.unit === "AUTO") {
          return 'Auto';
        } else if (lineHeight.unit === 'PIXELS') {
          return `${Math.floor(lineHeight.value * 10) / 10}`;
        } else if (lineHeight.unit === "PERCENT") {
          return `${Math.round(lineHeight.value)}`;
        } else {
          return 'Auto';
        }
      }

      // When we receive the lineheight from layers that don't have a style
      // we just need to just do some basic formatting.
      function formatLineHeightNumber(lineHeight) {
        if (lineHeight === "Auto") {
          return "Auto";
        } else {
          let formattedLineHeight = Math.round(lineHeight * 10) / 10;
          return formattedLineHeight;
        }
      }

      // Group text layers by style and send to UI
      function groupAndSendData(textLayers) {

        // Before we try and process all the text layers,
        // make sure we have any text layers, the users selection
        // could have just been frames, vectors, shapes etc.
        if (textLayers.length === 0) {
          figma.ui.postMessage({ type: 'noTextLayerFound' });
          return
        }

        const groupedByStyle = textLayers.reduce((acc, layer) => {
          let styleInfo;
          let styleKey;

          // Check if layer has a textStyleId and find the matching local style
          if (layer.textStyleId) {
            const matchedStyle = localTextStyles.find(style => style.id === layer.textStyleId);

            if (matchedStyle) {
              // Use the style's ID as the key and add more style info
              styleKey = layer.textStyleId;
              styleInfo = {
                fontFamily: matchedStyle.fontName,
                fontWeight: matchedStyle.fontWeight,
                fontSize: matchedStyle.fontSize,
                lineHeight: formatStyleLineHeight(matchedStyle.lineHeight),
                letterSpacing: matchedStyle.letterSpacing,
                hasStyle: true, // Indicates that this layer is using a defined style
                hasVariable: false,
                name: matchedStyle.name,
              };
            }
          }

          // If no textStyleId or no matched style, use other properties
          if (!styleInfo) {

            let openTypeFeaturesKey = '';

            // OpenType features are rare, like unique characters
            // if any are enabled, we add that to the unique key.
            if (layer.openTypeFeatures && Object.keys(layer.openTypeFeatures).length > 0) {
              openTypeFeaturesKey = Object.entries(layer.openTypeFeatures)
                .map(([feature, value]) => `${feature}-${value}`)
                .join('-');
            }

            // The Style key is how we tell text layers apart.
            // This is a long string of all their properties, so any text layers with a decimal difference in line height
            // won't be considered the same.
            styleKey = `${layer.fontFamily}-${layer.fontWeight}-${layer.fontSize}-${layer.lineHeight}-${layer.letterSpacing}-${layer.paragraphSpacing}-${layer.textAlign}-${layer.verticalAlign}-${layer.textCase}-${layer.textDecoration}-${layer.hangingList}-${layer.hangingPunctuation}-${layer.paragraphIndent}-${openTypeFeaturesKey}`;
            // styleKey = `${layer.fontFamily}-${layer.fontWeight}-${layer.fontSize}-${(layer.lineHeight)}-${layer.letterSpacing}-${layer.boundVariables}`;

            // Style info is how we format the data to display in the UI.
            styleInfo = {
              ...layer,
              lineHeight: formatLineHeightNumber(layer.lineHeight),
              hasStyle: false,
              hasVariable: !!layer.boundVariables, // Variable fonts will display differently in the UI.
            };
          }

          // Initialize the group if it doesn't exist
          if (!acc[styleKey]) {
            acc[styleKey] = { count: 0, ids: [], style: styleInfo };
          }

          // Increment count, push layer ID
          acc[styleKey].count++;
          acc[styleKey].ids.push(layer.id);

          return acc;
        }, {});

        // Convert to array and post message
        const stylesArray = Object.values(groupedByStyle).map(group => ({
          count: group.count,
          ids: group.ids,
          style: group.style
        }));

        // Sort the array by hasStyle and count
        stylesArray.sort((a, b) => {
          // First, sort by hasStyle status (true first)
          if (a.style.hasStyle && !b.style.hasStyle) {
            return -1; // a before b
          } else if (!a.style.hasStyle && b.style.hasStyle) {
            return 1; // b before a
          } else {
            // If both have the same hasStyle status, sort by count (descending)
            return b.count - a.count;
          }
        });

        figma.ui.postMessage({ type: 'returnTextLayers', data: stylesArray });
      }


    } else {
      figma.ui.postMessage({ type: 'noLayerSelected' });
    }
  }

  if (msg.type === "selectNodes") {
    // We don't want to trigger the "onSelectionChange" event at the top of this file
    // as we may want to keep selecting variables from my original selection so we set it to True.
    selectAllUsed = true;

    const layerArray = msg.nodeArray;
    let nodesToBeSelected = [];

    layerArray.forEach(item => {
      let layer = figma.getNodeById(item);
      // Using selection and viewport requires an array.
      nodesToBeSelected.push(layer);
    });

    // Select the nodes
    figma.currentPage.selection = nodesToBeSelected;

    // After a brief pause we reset the variable in case the user
    // starts selecting nodes again.
    setTimeout(() => {
      selectAllUsed = false;
    }, 500);
  }
};
