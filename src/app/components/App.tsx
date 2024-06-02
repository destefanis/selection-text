import React, { useState, useRef } from 'react';
import styleIcon from '../assets/style.svg';
import selectIcon from '../assets/select.svg';
import refreshIcon from '../assets/refresh.svg';
import '../styles/ui.css'

function App() {
  const [layersSelected, setLayersSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [textLayers, setTextLayers] = useState([]);
  const [localTextStyles, setLocalTextStyles] = useState([]);

  const getLocalTextStyles = () => {
    parent.postMessage({ pluginMessage: { type: 'getLocalTextStyles' } }, '*');
  };

  // Scan the users selection for text layers.
  const handleGetTextLayers = () => {
    // setIsLoading(true);
    parent.postMessage({ pluginMessage: { type: 'getSelectedTextLayers' } }, '*');
  };

  // User has clicked a select all layers icon
  const handleSelectClick = (ids) => {
    parent.postMessage({ pluginMessage: { type: 'selectNodes', nodeArray: ids } }, '*');
  };

  window.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      // Close plugin when pressing Escape
      window.parent.postMessage({ pluginMessage: { type: "close" } }, "*");
    }
  });

  // Ref to track the current value of layersSelected
  const layersSelectedRef = useRef(layersSelected);

  // Update the ref every time layersSelected changes
  React.useEffect(() => {
    layersSelectedRef.current = layersSelected;
  }, [layersSelected]);

  React.useEffect(() => {
    // Find the local text styles from Figma
    getLocalTextStyles();
    handleGetTextLayers();

    window.onmessage = event => {

      if (event.data.pluginMessage.type === 'returnLocalTextStyles') {
        setLocalTextStyles(event.data.pluginMessage.data);
      }

      if (event.data.pluginMessage.type === 'noLayerSelected') {
        setLayersSelected(false);
        setIsLoading(false);
      }

      // When we have all the text layers selected by the user
      // we can update our UI.
      if (event.data.pluginMessage.type === 'returnTextLayers') {
        setTextLayers(event.data.pluginMessage.data);
        console.log(event.data.pluginMessage.data);
        setLayersSelected(true);
        console.log(layersSelected);
        setIsLoading(false);
      }

      if (event.data.pluginMessage.type === 'change') {
        console.log(layersSelectedRef.current); // Use the ref's current value
        if (!layersSelectedRef.current) {
          handleGetTextLayers();
        } else {
          console.log('Layer is already selected');
        }
      }
    };
  }, []);

  return (
    <div className="wrapper">
      {isLoading ? (
        <p>Loading...</p>
      ) : layersSelected ? (
        <React.Fragment>
          <div className="section-header">
          <h3 className="section-label">Selection Text</h3>
          <img src={refreshIcon} alt="Refresh Icon" className="icon refresh-icon" onClick={() => handleGetTextLayers()}/>
          </div>
          
          <ul className="list">
            {textLayers.map(layer => (
              <li className="list-item" key={layer.style.id}>
                {layer.style.hasStyle ? (
                  <div className="list-item-content">
                    <span className="style-indicator-wrapper">
                      <span className="style-indicator" style={{ fontFamily: layer.style.fontFamily, fontWeight: layer.style.fontWeight, fontSize: Math.min(12, layer.style.fontSize) + 'px' }}>
                        Ag
                      </span>
                    </span>
                    
                      <span className="label">{layer.style.name}</span><span className="secondary"><span className="dot">·</span>{layer.style.fontSize}/{layer.style.lineHeight}</span>
                    
                  </div>
                ) : (
                  <div className="list-item-content">
                    <span className="label">{layer.style.fontFamily} {layer.style.fontWeight}</span><span className="secondary"><span className="dot">·</span> {layer.style.fontSize}/{layer.style.lineHeight}</span>
                  </div>
                )}
                <div className="icons">
                  {layer.style.hasStyle ? (
                    <img src={selectIcon} alt="Select Icon" className="icon" onClick={() => handleSelectClick(layer.ids)} />
                  ) : (
                    <>
                      <img src={styleIcon} alt="Style Icon" className="icon" />
                      <img src={selectIcon} alt="Select Icon" className="icon" onClick={() => handleSelectClick(layer.ids)} />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          
        </React.Fragment>
      ) : (
        // Display the welcome screen if no layers are selected
        <div className="initial-screen">
          <p>You haven't selected any text layers yet.</p>
          <div className="secondary-button" onClick={handleGetTextLayers}>Get Text Layers</div>
        </div>
      )}
    </div>
  );
}

export default App;
