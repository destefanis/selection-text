import React, { useState, useRef } from 'react';
import styleIcon from '../assets/style.svg';
import selectIcon from '../assets/select.svg';
import refreshIcon from '../assets/refresh.svg';
import verticalMoreIcon from '../assets/vertical-more.svg';
import closeIcon from '../assets/close.svg';
import pluginIcon from '../assets/plugin-icon.png';
import '../styles/ui.css'

function App() {
  const [layersSelected, setLayersSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [textLayers, setTextLayers] = useState([]);
  const [localTextStyles, setLocalTextStyles] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState(null);

  const [showAllStyled, setShowAllStyled] = useState(false);

  // Separate styled and unstyled layers
  const styledLayers = textLayers.filter(layer => layer.style.hasStyle);
  const unstyledLayers = textLayers.filter(layer => !layer.style.hasStyle);
  const visibleStyledLayers = showAllStyled ? styledLayers : styledLayers.slice(0, 3);
  const hiddenStyledCount = styledLayers.length - visibleStyledLayers.length;

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

  const handleLayerClick = (layer) => {
    setSelectedLayer(layer);
    // parent.postMessage({ pluginMessage: { type: 'resize', width: 480, height: 400 } }, '*');
  };

  const handleCloseDetails = () => {
    setSelectedLayer(null);
    // parent.postMessage({ pluginMessage: { type: 'resize', width: 240, height: 400 } }, '*');
  };


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

      if (event.data.pluginMessage.type === 'noTextLayerFound') {
        setLayersSelected(false);
      }

      // When we have all the text layers selected by the user
      // we can update our UI.
      if (event.data.pluginMessage.type === 'returnTextLayers') {
        setTextLayers(event.data.pluginMessage.data);
        setLayersSelected(true);
        setIsLoading(false);
      }

      if (event.data.pluginMessage.type === 'change') {
        if (!layersSelectedRef.current) {
          handleGetTextLayers();
        } else {
          console.log('Layer is already selected');
        }
      }
    };
  }, []);

  const SelectedLayerDetails = ({ layer, onClose }) => {
    if (!layer) return null;

    return (
      <div className="layer-details">
          <img src={closeIcon} alt="Close Icon" className="icon refresh-icon" onClick={onClose}/>
        <h3>Node Properties</h3>
        <ul>
          {Object.entries(layer).map(([key, value]) => (
            <li key={key}>
              <strong>{key}:</strong> {JSON.stringify(value, null, 2)}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="wrapper">
      {isLoading ? (
        <p>Loading...</p>
      ) : layersSelected ? (
        <React.Fragment>
          {/* <div className="sidebar" style={{
            width: selectedLayer ? '240px' : '0',
            padding: selectedLayer ? '0 4px 0px 8px' : '0',
            borderRight: selectedLayer ? '1px solid #e6e6e6' : 'none',
            overflow: 'hidden',
            // transition: 'width 0.3s ease, padding 0.3s ease'
          }}>
            {selectedLayer && <SelectedLayerDetails layer={selectedLayer} onClose={handleCloseDetails} />}
          </div> */}
          <div className="list-container">
            <div className="section-header">
              <h3 className="section-label">Selection Text</h3>
              <img src={refreshIcon} alt="Refresh Icon" className="icon refresh-icon" onClick={() => handleGetTextLayers()} />
            </div>
            <ul className="list">
              {visibleStyledLayers.map(layer => (
                <li className="list-item" key={layer.style.id}>
                  <div className="list-item-content">
                    <span className="style-indicator-wrapper">
                      <span className="style-indicator" style={{ fontFamily: layer.style.fontFamily, fontWeight: layer.style.fontWeight, fontSize: Math.min(12, layer.style.fontSize) + 'px' }}>
                        Ag
                      </span>
                    </span>
                    <span className="label">{layer.style.name}</span><span className="secondary"><span className="style-dot">·</span>{layer.style.fontSize}/{layer.style.lineHeight}</span>
                  </div>
                  <div className="icons">
                    <img src={selectIcon} alt="Select Icon" className="icon" onClick={() => handleSelectClick(layer.ids)} />
                  </div>
                </li>
              ))}
              {hiddenStyledCount > 0 && !showAllStyled && (
                <li className="list-item" onClick={() => setShowAllStyled(true)}>
                  <div className="list-item-content show-more">
                    <img src={verticalMoreIcon} alt="More Icon" className="inline-icon" />See all {hiddenStyledCount} text styles
                  </div>
                </li>
              )}
              {unstyledLayers.map(layer => (
                <li className="list-item" key={layer.style.id} onClick={() => handleLayerClick(layer)}>
                  <div className="list-item-content">
                    <span className="label">
                      {layer.style.hasVariable ? (
                        <span className="variable-font">{layer.style.fontFamily}</span>
                      ) : (
                        layer.style.fontFamily
                      )} {layer.style.fontWeight}
                    </span>
                    <span className="secondary">
                      <span className="dot">·</span> {layer.style.fontSize}/{layer.style.lineHeight}
                    </span>
                  </div>
                  <div className="icons">
                    {/* <img src={styleIcon} alt="Style Icon" className="icon" /> */}
                    <img src={selectIcon} alt="Select Icon" className="icon" onClick={() => handleSelectClick(layer.ids)} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </React.Fragment>
      ) : (
        // Display the welcome screen if no layers are selected
        <div className="initial-screen">
          <div className="initial-screen-content">
            <img className="plugin-icon" src={pluginIcon} />
            <p>Select a text layer to get started.</p>
          </div>
          <div className="button-wrapper">
            <div className="secondary-button" onClick={handleGetTextLayers}>Get text layers</div>
            <div className="secondary-button no-outline" onClick={handleGetTextLayers}>Scan entire page</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
