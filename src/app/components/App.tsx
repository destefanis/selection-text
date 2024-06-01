import React, { useState } from 'react';
import '../styles/ui.css'

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [textLayers, setTextLayers] = useState([]);
  const [localTextStyles, setLocalTextStyles] = useState([]);

  const getLocalTextStyles = () => {
    parent.postMessage({ pluginMessage: { type: 'getLocalTextStyles' } }, '*');
  };

  const handleGetTextLayers = () => {
    setIsLoading(true);
    parent.postMessage({ pluginMessage: { type: 'getSelectedTextLayers' } }, '*');
  };

  React.useEffect(() => {
    // Find the local text styles from Figma
    getLocalTextStyles();

    window.onmessage = event => {

      if (event.data.pluginMessage.type === 'returnLocalTextStyles') {
        setLocalTextStyles(event.data.pluginMessage.data);
      }

      // When we have all the text layers selected by the user
      // we can update our UI.
      if (event.data.pluginMessage.type === 'returnTextLayers') {
        setTextLayers(event.data.pluginMessage.data);
        setIsLoading(false);
      }
    };
  }, []);

  return (
    <div className="wrapper">
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <React.Fragment>
          <h3 className="section-label">Selection Text</h3>
          <ul className="list">
            {textLayers.map(layer => (
              <li className="list-item" key={layer.style.id}>
                {layer.style.hasStyle ? (
                  <div>
                    <span className="style-indicator-wrapper">
                      <span className="style-indicator" style={{ fontFamily: layer.style.fontFamily, fontWeight: layer.style.fontWeight, fontSize: Math.min(13, layer.style.fontSize) + 'px' }}>
                        Ag
                      </span>
                    </span>
                    <span style={{ marginLeft: '8px' }}>
                      <span className="label">{layer.style.name}</span><span className="secondary"> · {layer.style.fontSize}/{layer.style.lineHeight}</span>
                    </span>
                  </div>
                ) : (
                  <span><span className="label">{layer.style.fontFamily} {layer.style.fontWeight}</span><span className="secondary"> · {layer.style.fontSize}/{layer.style.lineHeight}</span></span>
                )}
              </li>
            ))}
          </ul>
          <button onClick={handleGetTextLayers}>Get Text Layers</button>
        </React.Fragment>
      )}
    </div>
  );
}

export default App;
