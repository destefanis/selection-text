figma.showUI(__html__, { width: 240, height: 400 });
figma.skipInvisibleInstanceChildren = true;

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'getSelectedTextLayers') {
    if (figma.currentPage.selection.length > 0) {
      const selection = figma.currentPage.selection;

      // Define an async generator function to find text layers in the selection
      async function* findTextLayers(selection) {
        let textLayers = [];

        // Define a recursive function to check each node and its children for text layers
        async function checkNode(node) {
          if (node.type === "TEXT") {
            // await figma.loadFontAsync(node.fontName);  // Ensure the font is loaded
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
              x: node.x,
              y: node.y,
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

      // Group text layers by style and send to UI
      function groupAndSendData(textLayers) {
        const groupedByStyle = textLayers.reduce((acc, layer) => {
          const styleKey = `${layer.fontFamily}-${layer.fontWeight}-${layer.fontSize}-${layer.lineHeight}-${layer.letterSpacing}-${layer.textAlign}-${layer.textStyleId}`;
          if (!acc[styleKey]) {
            acc[styleKey] = { count: 0, ids: [], style: layer };
          }
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
        figma.ui.postMessage({ type: 'textStyles', data: stylesArray });
        console.log(stylesArray);
      }

    } else {
      figma.notify("Please select at least one layer.");
    }
  }
};
