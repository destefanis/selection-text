import React, { useState } from 'react';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [textLayers, setTextLayers] = useState([]);

  const handleGetTextLayers = () => {
    setIsLoading(true);
    parent.postMessage({ pluginMessage: { type: 'getSelectedTextLayers' } }, '*');
  };

  const handleTextLayers = event => {
    if (event.data.pluginMessage.type === 'textStyles') {
      setTextLayers(event.data.pluginMessage.data);
      setIsLoading(false);
    }
  };

  window.onmessage = handleTextLayers;

  return (
    <div>
      <button onClick={handleGetTextLayers}>Get Text Layers</button>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        textLayers.map(layer => (
          <div key={layer.style.id}>
            <p>{layer.style.fontFamily} {layer.style.fontWeight} - {layer.style.fontSize}/{layer.style.lineHeight}</p>
            {/* <p>Text: {layer.text}</p> */}
          </div>
        ))
      )}
    </div>
  );
}

export default App;
