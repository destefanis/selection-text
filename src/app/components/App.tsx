import React, { useState, useRef } from 'react';
import selectIcon from '../assets/select.svg';
import verticalMoreIcon from '../assets/vertical-more.svg';
import pluginIcon from '../assets/plugin-icon.png';
import settingsIcon from '../assets/settings.svg';
// import styleIcon from '../assets/style.svg';
import refreshIcon from '../assets/refresh.svg';
import '../styles/ui.css'

function App() {
  const [layersSelected, setLayersSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [textLayers, setTextLayers] = useState([]);
  const [showAllStyled, setShowAllStyled] = useState(false);
  const [menuState, setMenuState] = useState(false);
  const [localTextStyles, setLocalTextStyles] = useState([]);

  // Separate styled and unstyled layers
  const [styledLayers, setStyledLayers] = useState([]);
  const [unstyledLayers, setUnstyledLayers] = useState([]);

  React.useEffect(() => {
    setStyledLayers(textLayers.filter(layer => layer.style.hasStyle));
    setUnstyledLayers(textLayers.filter(layer => !layer.style.hasStyle));
  }, [textLayers]);

  // This is for making sure styles don't show as more than 3 at a time
  // without the overflow menu
  const visibleStyledLayers = showAllStyled ? styledLayers : styledLayers.slice(0, 3);
  const hiddenStyledCount = styledLayers.length - visibleStyledLayers.length;

  const getLocalTextStyles = () => {
    parent.postMessage({ pluginMessage: { type: 'getLocalTextStyles' } }, '*');
  };

  const getRemoteTextStyles = () => {
    parent.postMessage({ pluginMessage: { type: 'getRemoteTextStyles' } }, '*');
  };

  // Scan the users selection for text layers.
  const handleGetTextLayers = () => {
    parent.postMessage({ pluginMessage: { type: 'getSelectedTextLayers', button: "user" } }, '*');
  };

  // Scan the entire page for text layers.
  const handleScanAllLayers = () => {
    parent.postMessage({ pluginMessage: { type: 'getSelectedTextLayers', button: "all" } }, '*');
  };

  // User has clicked a select all layers icon
  const handleSelectClick = (ids) => {
    parent.postMessage({ pluginMessage: { type: 'selectNodes', nodeArray: ids } }, '*');
  };

  const handleRefresh = () => {
    parent.postMessage({ pluginMessage: { type: 'getLocalTextStyles' } }, '*');
    parent.postMessage({ pluginMessage: { type: 'getSelectedTextLayers', button: "user" } }, '*');
  };

  // In a future update we'll open a details menu, this function displays it.
  // const handleLayerClick = (layer) => {
  //   setSelectedLayer(layer);
  //   parent.postMessage({ pluginMessage: { type: 'resize', width: 480, height: 400 } }, '*');
  // };

  // const handleCloseDetails = () => {
  //   setSelectedLayer(null);
  //   parent.postMessage({ pluginMessage: { type: 'resize', width: 240, height: 400 } }, '*');
  // };

  // Ref used for listening to click events outside the context menu
  const ref = useRef();

  // Opens or closes the context menu
  const handleOpenSettings = () => {
    // Opens the settings menu
    if (menuState === false) {
      setMenuState(true);
    } else if (menuState === true) {
      setMenuState(false);
    }
  };

  // When clicking outside the context menu, hide it.
  useOnClickOutside(ref, () => hideMenu());

  const hideMenu = () => {
    setMenuState(false);
  };

  // Ref to track the current value of layersSelected
  const layersSelectedRef = useRef(layersSelected);

  // Update the ref every time layersSelected changes
  React.useEffect(() => {
    layersSelectedRef.current = layersSelected;
  }, [layersSelected]);

  // Handles the filtering settings.
  const sortLayers = (criteria) => {
    let sortedStyledLayers = [...styledLayers];
    let sortedUnstyledLayers = [...unstyledLayers];

    switch (criteria) {
      case 'Most Common':
        sortedStyledLayers.sort((a, b) => b.count - a.count);
        sortedUnstyledLayers.sort((a, b) => b.count - a.count);
        // console.log(sortedUnstyledLayers);
        break;
      case 'Least Common':
        sortedStyledLayers.sort((a, b) => a.count - b.count);
        sortedUnstyledLayers.sort((a, b) => a.count - b.count);
        // console.log(sortedUnstyledLayers);
        break;
      case 'Largest Font Size':
        sortedStyledLayers.sort((a, b) => b.style.fontSize - a.style.fontSize);
        sortedUnstyledLayers.sort((a, b) => b.style.fontSize - a.style.fontSize);
        // console.log(sortedUnstyledLayers);
        break;
      case 'Smallest Font Size':
        sortedStyledLayers.sort((a, b) => a.style.fontSize - b.style.fontSize);
        sortedUnstyledLayers.sort((a, b) => a.style.fontSize - b.style.fontSize);
        // console.log(sortedUnstyledLayers);
        break;
      default:
        break;
    }

    setStyledLayers(sortedStyledLayers);
    setUnstyledLayers(sortedUnstyledLayers);
  };

  React.useEffect(() => {
    // Find the local text styles from Figma
    getLocalTextStyles();
    getRemoteTextStyles();
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
        handleGetTextLayers();
      }
    };
  }, []);

  // Side Menu to display details
  // const SelectedLayerDetails = ({ layer, onClose }) => {
  //   if (!layer) return null;

  //   return (
  //     <div className="layer-details">
  //       <img src={closeIcon} alt="Close Icon" className="icon refresh-icon" onClick={onClose} />
  //       <h3>Node Properties</h3>
  //       <ul>
  //         {Object.entries(layer).map(([key, value]) => (
  //           <li key={key}>
  //             <strong>{key}:</strong> {JSON.stringify(value, null, 2)}
  //           </li>
  //         ))}
  //       </ul>
  //     </div>
  //   );
  // };

  return (
    <div className="wrapper">
      {isLoading ? (
        <p>Loading...</p>
      ) : layersSelected ? (
        <React.Fragment>
          {/* For a future sidebar feature*/}
          {/* <div className="sidebar" style={{
            width: selectedLayer ? '240px' : '0',
            padding: selectedLayer ? '0 4px 0px 8px' : '0',
            borderRight: selectedLayer ? '1px solid #e6e6e6' : 'none',
            overflow: 'hidden',
            // transition: 'width 0.3s ease, padding 0.3s ease'
          }}>
            {selectedLayer && <SelectedLayerDetails layer={selectedLayer} onClose={handleCloseDetails} />}
          </div> */}

          <div className="list-container" ref={ref}>
            <div className="section-header">
              <h3 className="section-label">Selection Text</h3>
              <img src={settingsIcon} alt="Settings Icon" className="icon refresh-icon" onClick={() => handleOpenSettings()} />
              <img src={refreshIcon} alt="Refresh Icon" className="icon settings-icon" onClick={() => handleRefresh()} />
            </div>
            <ul
              className={
                "menu-items select-menu__list " +
                (menuState ? "select-menu__list--active" : "")
              }
            >
              <li className="select-menu__divider-label select-menu__divider-label--first">
                Sort by
              </li>
              <li
                className="select-menu__list-item"
                key="list-item-1"
                onClick={event => {
                  event.stopPropagation();
                  sortLayers('Most Common');
                  hideMenu();
                }}
              >
                Most common
              </li>
              <li
                className="select-menu__list-item"
                key="list-item-2"
                onClick={event => {
                  event.stopPropagation();
                  sortLayers('Least Common');
                  hideMenu();
                }}
              >
                By least common
              </li>
              <li
                className="select-menu__list-item"
                key="list-item-3"
                onClick={event => {
                  event.stopPropagation();
                  sortLayers('Largest Font Size');
                  hideMenu();
                }}
              >
                By largest size
              </li>
              <li
                className="select-menu__list-item"
                key="list-item-4"
                onClick={event => {
                  event.stopPropagation();
                  sortLayers('Smallest Font Size');
                  hideMenu();
                }}
              >
                By smallest size
              </li>
            </ul>
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
                <li className="list-item" key={layer.style.id} onClick={() => handleSelectClick(layer.ids)}>
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
            <p>Select a text layer to get started</p>
          </div>
          <div className="button-wrapper">
            <div className="secondary-button" onClick={handleGetTextLayers}>Get text layers</div>
            <div className="secondary-button no-outline" onClick={handleScanAllLayers}>Select entire page</div>
          </div>
        </div>
      )}
    </div>
  );
}

// React hook click outside the component
function useOnClickOutside(ref, handler) {
  React.useEffect(() => {
    const listener = event => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

export default App;
