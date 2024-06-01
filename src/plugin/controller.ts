figma.showUI(__html__, { width: 240, height: 400 });
figma.skipInvisibleInstanceChildren = true;

let localTextStyles = {};

figma.ui.onmessage = async (msg) => {

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
        lineHeight: style.lineHeight ? (style.lineHeight.unit === 'PIXELS' ? style.lineHeight.value : style.lineHeight.unit) : 'AUTO',
        letterSpacing: style.letterSpacing ? (style.letterSpacing.unit === 'PIXELS' ? style.letterSpacing.value : style.letterSpacing.unit) : 'NORMAL',
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
    if (figma.currentPage.selection.length > 0) {
      const selection = figma.currentPage.selection;

      // Async generator function to find text layers in the selection
      async function* findTextLayers(selection) {
        let textLayers = [];

        // Recursive function to check each node and its children for text layers
        async function checkNode(node) {
          if (node.type === "TEXT") {
            textLayers.push({
              id: node.id,
              name: node.name,
              text: node.characters,
              fontFamily: node.fontName.family,
              fontWeight: node.fontName.style,
              fontSize: node.fontSize,
              lineHeight: (node.lineHeight && node.lineHeight.value) || "auto",
              letterSpacing: node.letterSpacing,
              paragraphSpacing: node.paragraphSpacing,
              textAlign: node.textAlignHorizontal,
              verticalAlign: node.textAlignVertical,
              width: node.width,
              height: node.height,
              textStyleId: node.textStyleId
            });
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
        return textLayers; // Return all collected text layers when done
      }

      // Instantiate the async generator
      const generator = findTextLayers(selection);
      const allTextLayers = [];

      // Function to exhaust the async generator and collect text layers
      async function processTextLayers() {
        let result;
        do {
          result = await generator.next();
          allTextLayers.push(...result.value);
        } while (!result.done);

        groupAndSendData(allTextLayers); // Group and send data once processing is complete
      }

      // Start processing
      await processTextLayers();

      function formatLineHeight(lineHeight) {

        // if (lineHeight.unit === "AUTO") {
        //   return 'Auto'
        // } else {
        //   return Math.floor(lineHeight.value * 10) / 10;
        // }

        // Check if lineHeight is an object and handle accordingly
        if (typeof lineHeight === 'object' && lineHeight !== null) {
          if (lineHeight.unit === 'PERCENT') {
            console.log(lineHeight);
            // If lineHeight is a percentage
            return lineHeight.value;
          } else if (lineHeight.unit === 'PIXELS') {
            // If lineHeight is specified in pixels, round to one decimal place
            return Math.floor(lineHeight.value * 10) / 10;
          }
        } else if (typeof lineHeight === 'number') {
          // If lineHeight is directly a number (not common in recent API versions)
          return Math.floor(lineHeight * 10) / 10;
        }
        // Default case when lineHeight is 'AUTO' or undefined
        return 'Auto';
      }


      // Group text layers by style and send to UI
      function groupAndSendData(textLayers) {

        const groupedByStyle = textLayers.reduce((acc, layer) => {
          let styleInfo;
          let styleKey;

          console.log(layer.lineHeight)

          // Check if layer has a textStyleId and find the matching local style
          if (layer.textStyleId) {
            const matchedStyle = localTextStyles.find(style => style.id === layer.textStyleId);
            if (matchedStyle) {
              // Use the style's ID as the key and add more style info
              styleKey = layer.textStyleId;
              styleInfo = {
                fontFamily: matchedStyle.fontName,
                fontWeight: matchedStyle.fontWeight,
                fontSize: matchedStyle.fontSize, // Ensure these properties exist
                lineHeight: formatLineHeight(matchedStyle.lineHeight),
                letterSpacing: matchedStyle.letterSpacing,
                hasStyle: true, // Indicates that this layer is using a defined style
                name: matchedStyle.name // Include the name of the style
              };
            }
          }

          // If no textStyleId or no matched style, use other properties
          if (!styleInfo) {
            styleKey = `${layer.fontFamily}-${layer.fontWeight}-${layer.fontSize}-${formatLineHeight(layer.lineHeight)}-${layer.letterSpacing}`;
            styleInfo = { ...layer, hasStyle: false };
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
      figma.notify("Please select at least one layer.");
    }
  }
};
