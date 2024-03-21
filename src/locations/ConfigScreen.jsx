import React, { useCallback, useState, useEffect } from 'react';
// import { Heading, Form, Paragraph, Flex } from '@contentful/f36-components';
import { Checkbox, TextInput, Form, FormControl  } from '@contentful/f36-components';
// import { css } from 'emotion';
import { /* useCMA, */ useSDK } from '@contentful/react-apps-toolkit';

import { Spinner } from '@contentful/f36-components';

import queryString from 'query-string'

import configScreenStyles from "./ConfigScreen.module.css"

const ConfigScreen = () => {

  // codecs map for UI
  let codecs = new Map([
    ["libx264", "H.264"],
    ["libx265", "H.265"],
    ["libvpx", "VP8"],
    ["libvpx-vp9", "VP9"],
    ["libaom-av1", "AV1"]
  ]); 

  const apiUrl = "https://api.qencode.com/v1/";

  const [parameters, setParameters] = useState({
      apikeyqencodeApiKey: "",
      templates: [], // Assuming templates is a part of parameters
      CMA_token: ''
  });

  const [showCMAToken, setShowCMAToken] = useState(false);

  const [savedApiKey, setSavedApiKey] = useState("")
  const [isValidatingApiKey, setIsValidatingApiKey] = useState(false)
  const [isValidationSuccess, setIsValidationSuccess] = useState(false)
  const [isCancellingKeyValidation, setIsCancellingKeyValidation] = useState(false)
  const [error, setError] = useState(null)

  const sdk = useSDK();
  /*
     To use the cma, inject it as follows.
     If it is not needed, you can remove the next line.
  */
  // const cma = useCMA();

 
  // ORIGINAL
  const onConfigure = useCallback(async () => {
    // This method will be called when a user clicks on "Install"
    // or "Save" in the configuration screen.
    // for more details see https://www.contentful.com/developers/docs/extensibility/ui-extensions/sdk-reference/#register-an-app-configuration-hook

    // Get current the state of EditorInterface and other entities
    // related to this app installation
    const currentState = await sdk.app.getCurrentState();

    const contentTypeID = "qencodeTranscodedAsset";
    const contentTypeName = "Video";

    // const contentTypeID = "qencodeAsset_05";
    // const contentTypeName = "Qencode Job 05";

    const subsContentTypeID = "subsItem";
    const subsContentTypeName = "Subtitles Item";

    try {
      // Check if the content type already exists

      // Check if the content type exists
      const contentTypes = await sdk.cma.contentType.getMany();

      // Check and create SRT content type
      const subsContentTypeExists = contentTypes.items.some((contentType) => contentType.sys.id === subsContentTypeID);

      if (subsContentTypeExists) {
        console.log(`Content type with ID "${subsContentTypeID}" exists.`);
      }       

      if (!subsContentTypeExists) {
        const newContentType = await sdk.cma.contentType.createWithId({
          contentTypeId: subsContentTypeID
        }, {
          name: subsContentTypeName,
          displayField: "title", // Display field
          fields: [
            {
              id: "title",
              name: "Title",
              type: "Symbol",
              localized: false,
              required: false,
              validations: [],
              disabled: false,
              omitted: false,
            },
            {
              id: "language",
              name: "Language",
              type: "Symbol", // Text field for the SRT file name
              required: true
            },
            {
              id: "file",
              name: "File",
              type: "Link",
              linkType: "Asset", // Link to the SRT file asset
              required: true
            }
          ]
        });

        console.log(`Content type "${newContentType.name}" created with ID "${newContentType.sys.id}".`);

        // publish this new content type
        const publishedContentType = await sdk.cma.contentType.publish({
            contentTypeId: newContentType.sys.id
          }, newContentType)
        console.log(`Content type "${publishedContentType.name}" published with ID "${publishedContentType.sys.id}".`);        

        // await sdk.cma.contentType.publish({ contentTypeId: subsContentTypeID }, srtContentType);
      }

   
      // creating and adding main content type

      const contentTypeExists = contentTypes.items.some((contentType) => contentType.sys.id === contentTypeID);

      if (contentTypeExists) {
        console.log(`Content type with ID "${contentTypeID}" exists.`);

        // this will add extra field to existing content type, so old user can just reconfigure the app without reinstalling

        // Retrieve the existing content type
        const existingContentType = await sdk.cma.contentType.get({ contentTypeId: contentTypeID });

        // Check if the 'subs' field exists
        const subsFieldExists = existingContentType.fields.some(field => field.id === 'subs');

        if (!subsFieldExists) {
          // Add the 'subs' field to the content type
          const updatedFields = existingContentType.fields.concat([{
            id: "subs",
            name: "Subtitles (optional)",
            type: "Array",
            items: {
              type: "Link",
              linkType: "Entry",
              validations: [{ linkContentType: [subsContentTypeID] }] // Links to Subtitles Items
            }
          }]);

          // Update the content type with the new field
          const updatedContentType = await sdk.cma.contentType.update({
            contentTypeId: contentTypeID,
            version: existingContentType.sys.version // Important: provide the current version
          }, {
            ...existingContentType,
            fields: updatedFields
          });

          console.log(`Content type "${updatedContentType.name}" updated with new 'subs' field.`);   
        }     

        // update fields to required
        if (subsFieldExists) {
          // Assuming `subsContentTypeID` holds the ID of your 'subs' content type
          const subsContentType = await sdk.cma.contentType.get({ contentTypeId: subsContentTypeID });
        
          // Flag to track if an update is needed
          let updateNeeded = false;
        
          // Check fields and update required property if not already true
          const fieldsToUpdate = subsContentType.fields.map(field => {
            if ((field.id === "language" || field.id === "file") && !field.required) {
              updateNeeded = true; // Set flag to true if any field needs updating
              return { ...field, required: true };
            }
            return field;
          });
        
          // Proceed with update if needed
          if (updateNeeded) {
            // Prepare the updated content type object
            const updatedSubsContentType = {
              ...subsContentType,
              fields: fieldsToUpdate
            };
        
            // Update and publish the content type
            await sdk.cma.contentType.update({
              contentTypeId: subsContentTypeID,
              version: subsContentType.sys.version
            }, updatedSubsContentType);
        
            console.log(`Content type "${subsContentTypeID}" updated: 'Language' and 'File' fields set as required.`);
          } else {
            console.log(`No update required for content type "${subsContentTypeID}": 'Language' and 'File' fields already set as required.`);
          }
        }
        
        

      } 

      // If content type doesn't exist, create it
      if (!contentTypeExists) {
        const newContentType = await sdk.cma.contentType.createWithId({
          contentTypeId: contentTypeID
        }, {
          name: contentTypeName,
          displayField: "title", // Display field
          fields: [
            {
              id: "title",
              name: "Title",
              type: "Symbol",
              localized: false,
              required: false,
              validations: [],
              disabled: false,
              omitted: false,
            },
            {
              id: "task_data",
              name: "Transcoding Data",
              type: "Object",
              localized: false,
              required: false,
              validations: [],
              disabled: false,
              omitted: false,
            },        
            {
              id: "media",
              name: "Media",
              type: "Link",
              localized: false,
              required: false,
              validations: [],
              disabled: false,
              omitted: false,
              linkType: "Asset",
            },
            {
              id: "subs",
              name: "Subtitles (optional)",
              type: "Array",
              items: {
                type: "Link",
                linkType: "Entry",
                validations: [{ linkContentType: [subsContentTypeID] }]
              },
            }
          ],
        });
        console.log(`Content type "${newContentType.name}" created with ID "${newContentType.sys.id}".`);

        // publish this new content type
        const publishedContentType = await sdk.cma.contentType.publish({
            contentTypeId: newContentType.sys.id
          }, newContentType)
        console.log(`Content type "${publishedContentType.name}" published with ID "${publishedContentType.sys.id}".`);

        
      }
    } catch (error) {
        console.error('Error creating content type:', error);
        return false;
    }

    return {
      // Parameters to be persisted as the app configuration.
      parameters,
      // In case you don't want to submit any update to app
      // locations, you can just pass the currentState as is
      targetState: currentState,
    };
  }, [parameters, sdk]);  
  

  useEffect(() => {
    // `onConfigure` allows to configure a callback to be
    // invoked when a user attempts to install the app or update
    // its configuration.
    sdk.app.onConfigure(() => onConfigure());
  }, [sdk, onConfigure]);

  useEffect(() => {
    (async () => {
      // Get current parameters of the app.
      // If the app is not installed yet, `parameters` will be `null`.
      const currentParameters = await sdk.app.getParameters();
      if (currentParameters) {
        setParameters(currentParameters);
      }
      // Once preparation has finished, call `setReady` to hide
      // the loading screen and present the app to a user.
      sdk.app.setReady();
    })();
  }, [sdk]);


  const getTemplates = async () => {
    console.log('Getting templates...');

    const data = { api_key: parameters.apikeyqencodeApiKey };

    try {
      const response = await fetch(`${apiUrl}request_templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: queryString.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setIsValidatingApiKey(false);
        setIsValidationSuccess(true);
        setError('');

        const templates = result.templates.map((template) => {
          return {
            id: template.template_id,
            enabled: false,
            originalName: template.name,
            name: template.name,
            description: '',
            query: template.query,
          };
        });

        setParameters({
          ...parameters,
          templates: templates,
        });
      } else {
        console.log('Error:', result.error);
        setError(result.error);

        setParameters({
          ...parameters,
          templates: [],
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const validateApiKey = async () => {
    console.log('Validating API key...');

    // Update state to show spinner and clean templates
    setIsValidatingApiKey(true);
    setIsCancellingKeyValidation(false);

    // Remove templates from parameters state
    setParameters({
      ...parameters,
      templates: [],
    });

    // Send request to get templates (assuming you have a function getTemplates)
    // This function should also update the state when templates are received
    await getTemplates();
  };  

  const changeApiKey = () => {
    console.log('Changing API key...');

    setIsValidatingApiKey(false);
    setIsValidationSuccess(false);
    setIsCancellingKeyValidation(true);
    setSavedApiKey(parameters.apikeyqencodeApiKey);
  };

  const cancelApiKeyValidation = () => {
    console.log('Cancel API key validation...');

    // Restore the value in the input to the savedApiKey or default
    setParameters({
      ...parameters,
      apikeyqencodeApiKey: savedApiKey || '',
    });

    setIsValidatingApiKey(false);
    setIsValidationSuccess(true);
    setIsCancellingKeyValidation(false);
  };

  const handleCheckboxChange = () => {
    setShowCMAToken(!showCMAToken);
  };

  const handleCMATokenChange = (e) => {
    setParameters({...parameters, CMA_token: e.target.value});
  };

  return (
    <div className={configScreenStyles.container}>
      <section>
        <h2>
          <span>1</span> API Key / Account Validation
        </h2>

        <div className={configScreenStyles.validationBox}>
          <label>API Key</label>

          <div className={configScreenStyles.inputContainer}>

            {error && (
              <div className={configScreenStyles.errorMessage}>
                {error}
              </div>
            )}

            <input
              className={error && configScreenStyles.error}
              type={isValidationSuccess ? "password" : "text"}
              disabled={isValidationSuccess ? true : false}
              value={parameters.apikeyqencodeApiKey || ""}
              onChange={(e) =>
                setParameters({
                  ...parameters,
                  apikeyqencodeApiKey: e.target.value,
                })
              }
            />

            {!isValidatingApiKey &&
              !isValidationSuccess && 
                <button onClick={validateApiKey}>
                  <span>Validate</span>
                </button>
            }

            {isValidatingApiKey && 
              <button>
                <span>Validating</span> <Spinner />
              </button>
            }

            {isValidationSuccess && (
              <button onClick={changeApiKey}>
                <span>Change API Key</span>
              </button>
            )}

            {isCancellingKeyValidation && (
              <button onClick={cancelApiKeyValidation}>
                <span>Cancel</span>
              </button>
            )}

          </div>
        </div>
      </section>


      {parameters.templates && parameters.templates.length > 0 && (
        <section>
          <h2>
            <span>2</span> Choose templates to display
          </h2>

          {parameters.templates.map((template, index) => {
            let { format } = JSON.parse(template.query).query;

            return (
              <div
                key={index}
                className={
                  template.enabled
                    ? `${configScreenStyles.templateContainer} ${configScreenStyles.enabled}`
                    : configScreenStyles.templateContainer
                }
              >
                <div className={configScreenStyles.templateHeader}>
                  <div>
                    <div className={configScreenStyles.checkboxSwitchContainer}>
                      <label>
                        <input
                          type="checkbox"
                          checked={template.enabled}
                          onChange={(e) => {
                            let updatedTemplates = [...parameters.templates];
                            updatedTemplates[index].enabled =
                              e.currentTarget.checked;
                            setParameters({
                              ...parameters,
                              templates: updatedTemplates,
                            });
                          }}
                        />
                        <span
                          className={configScreenStyles.checkboxSwitchSlider}
                        ></span>
                      </label>
                    </div>
                    <div className={configScreenStyles.templateTitle}>
                      {template.originalName}
                    </div>
                  </div>

                  <div>
                    <div className={configScreenStyles.formatListContainer}>
                      {format.map((formatItem, i) => {
                        let { output } = formatItem;
                        let { stream } = formatItem;

                        return (
                          <React.Fragment key={i}>
                            {stream ? (
                              <>
                                {output && (
                                  <div
                                    className={configScreenStyles.formatOutput}
                                  >
                                    {output.split('_')[1]}
                                  </div>
                                )}

                                <div
                                  className={configScreenStyles.formatVideoCodec}
                                >
                                  {codecs.get(stream[0].video_codec)}
                                </div>

                                {stream.map((streamFormat, i) => {
                                  return (
                                    <React.Fragment key={i}>
                                      {streamFormat.width && (
                                        <div
                                          className={
                                            configScreenStyles.formatWidth
                                          }
                                        >
                                          {streamFormat.width}
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </>
                            ) : (
                              <>
                                {output && (
                                  <div
                                    className={configScreenStyles.formatOutput}
                                  >
                                    {output}
                                  </div>
                                )}

                                {formatItem.video_codec && (
                                  <div
                                    className={
                                      configScreenStyles.formatVideoCodec
                                    }
                                  >
                                    {codecs.get(formatItem.video_codec)}
                                  </div>
                                )}

                                {formatItem.width && (
                                  <div
                                    className={
                                      configScreenStyles.formatWidth
                                    }
                                  >
                                    {formatItem.width}
                                  </div>
                                )}
                              </>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {template.enabled && (
                  <div className={configScreenStyles.templateBody}>
                    <div>
                      <label>Display Name</label>
                      <input
                        type="text"
                        value={template.name}
                        onChange={(e) => {
                          let updatedTemplates = [...parameters.templates];
                          updatedTemplates[index].name = e.currentTarget.value;
                          setParameters({
                            ...parameters,
                            templates: updatedTemplates,
                          });
                        }}
                      />
                    </div>

                    <div>
                      <label>Description (optional)</label>
                      <input
                        type="text"
                        value={template.description}
                        onChange={(e) => {
                          let updatedTemplates = [...parameters.templates];
                          updatedTemplates[index].description =
                            e.currentTarget.value;
                          setParameters({
                            ...parameters,
                            templates: updatedTemplates,
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section>
        <Form>
          <FormControl>
            <Checkbox
              id="cmaTokenCheckbox"
              isChecked={showCMAToken}
              onChange={handleCheckboxChange}
            >
              CMA Token (Optional)
            </Checkbox>            
          </FormControl>
          
          {showCMAToken && (
            <FormControl>
              <TextInput
                width="medium"
                type="text"
                id="cmaTokenInput"
                name="cmaToken"
                value={parameters.CMA_token}
                onChange={handleCMATokenChange}
                placeholder="Enter your CMA Token"
              />
            </FormControl>
          )}            
          
        </Form>

      

      </section>
      
    </div>
  );

};
export default ConfigScreen;
