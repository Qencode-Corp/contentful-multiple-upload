import React, { useState, useEffect, useCallback } from 'react';
import { useSDK } from '@contentful/react-apps-toolkit';

import { v4 as uuidv4 } from "uuid";

import { generateSignedUrl } from '../utils/sign-url'

import { RandomizedFileName } from '../utils/filenameUtils';
import { QencodeApiRequest } from '../services/api';

import imgDone from "../images/done.png";
import svgLoader from "../images/loader.svg";

import Status from '../components/Status'

import sidebarStyles from "./Sidebar.module.css"

const Sidebar = () => {
  const sdk = useSDK();

  // Initialize videoSrc state with the current value from local storage
  const [videoSrc, setVideoSrc] = useState(localStorage.getItem('videoSrc') || null);

  // Get subsDetails from Field when user adds them
  // const [subsDetails, setSubsDetails] = useState(localStorage.getItem('subsDetails') || null);

  const [isPublished, setIsPublished] = useState(false);

  const [transcodedStarted, setTranscodedStarted] = useState(false);
  const [transcodeFinished, setTranscodeFinished] = useState(false);

  const [error, setError] = useState(null);

  const [duringTranscodingError, setDuringTranscodingError] = useState("");

  const [retranscode, setRetranscode] = useState(false);


  // Extract apikey and templates from parameters
  const { apikeyqencodeApiKey } = sdk.parameters.installation;
  const { templates } = sdk.parameters.installation;

  // Filter templates where 'enabled' field is true
  const enabledTemplates = templates.filter(template => template.enabled === true);

  // list of transcoding jobs
  const [transcodingJobs, setTranscodingJobs] = useState([]);

  // list transcoding results 
  const [transcodingResults, setTranscodingResults] = useState([]);


  // Listen for changes in local storage for 'videoSrc'
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'videoSrc') {
        setVideoSrc(event.newValue || null);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);


  // there is a problem here when retranscoding
  // check if Draft or Published
  useEffect(() => {
    const checkPublicationStatus = () => {
      const sys = sdk.entry.getSys();
      const isPublishedNow = !!sys.publishedVersion && sys.version <= sys.publishedVersion + 1;
      setIsPublished(isPublishedNow);
    };

    // Initial check
    checkPublicationStatus();

    // Subscribe to changes
    const detach = sdk.entry.onSysChanged(checkPublicationStatus);

    // Cleanup subscription
    return () => detach();
  }, [sdk.entry]);

  
  const startTranscodingForTemplates = useCallback(async () => {
    console.log("apikeyqencodeApiKey: ", apikeyqencodeApiKey)
    console.log("videoSrc: ", videoSrc)


    // Initialize an empty array for subtitles details
    let subsDetails = [];

    // Fetch subtitles linked to the entry
    try {
      const subsEntries = await sdk.entry.fields.subs.getValue(); // Assuming 'subs' is the ID of your field
      //console.log("subsEntries: ", subsEntries)
      if (subsEntries && subsEntries.length > 0) {
        // Fetch details for each subtitle entry
        const subtitlesDetails = await Promise.all(subsEntries.map(async (subEntry) => {
          const entry = await sdk.cma.entry.get({ entryId: subEntry.sys.id });

          const languages = Object.keys(entry.fields.file);
          const defaultLanguage = languages[0];
          const assetId = entry.fields.file[defaultLanguage]?.sys?.id;

          // give warning to user in case language field is not present
          if (assetId) {
            const asset = await sdk.cma.asset.get({ assetId });
            const fileUrl = asset.fields.file[defaultLanguage].url;

            //const fileUrl = "https://assets.secure.ctfassets.net/bxi8qfap1ql5/4P6Sm9ySZcL8eNSFs1vfT2/33df3bc174e0135f836ba864ee42806c/ukr__2_.srt"

            // Prepare the language value, use null if the 'language' field is missing
            const language = entry.fields.language && entry.fields.language[defaultLanguage]
                            ? entry.fields.language[defaultLanguage]
                            : null;

            if (!language) {
                console.warn(`Warning: 'language' field is missing for subtitle entry with ID ${subEntry.sys.id}. This field is required.`);
            }


            // step 1, check if asset is embargoed asset

            const isEmbargoed = fileUrl.startsWith('https://images.secure.ctfassets.net') ||
            fileUrl.startsWith('https://assets.secure.ctfassets.net') ||
            fileUrl.startsWith('https://videos.secure.ctfassets.net') ||
            fileUrl.startsWith('https://downloads.secure.ctfassets.net');     

            if(isEmbargoed){

              // const { policy, secret } = {
              //   "policy": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjE6MSJ9.eyJleHAiOjE2MTIyODE0MTEsInN1YiI6Inl6MjJwOGZzeGhpNiIsImF1ZCI6ImFkbiIsImp0aSI6ImQ1NWI2YmM1LTkyMGEtNDRjNi1hNmQ0LTM0YzRhYmIyYjdkNiIsImN0Zjp1bnB1YiI6dHJ1ZX0",
              //   "secret": "-jE6hqytutc_dygbjShVq0PijvDn80SdT0EWD1mNHgc"
              // }              

              try {

                // If no expiry is specified, default to longest expiry: 48h
                const expiresAtMs = Date.now() + 48 * 60 * 60 * 1000

                const { policy, secret } = await sdk.cma.assetKey.create({}, {
                  expiresAt: Math.floor(expiresAtMs / 1000) // in seconds
                })

                const signedUrl = await generateSignedUrl(policy, secret, fileUrl, expiresAtMs);
                // Use the signed URL as needed

                return {
                    language,
                    fileUrl: signedUrl
                };

              } catch (error) {
                  console.error('Error generating signed URL:', error);
              }              

            } else {
              return {
                  language,
                  fileUrl: fileUrl
              };
            }    



            // // Always return fileUrl, language may be null if not present
            // return {
            //     language,
            //     fileUrl: fileUrl
            // };
          }


        }));

        subsDetails = subtitlesDetails

        //console.log("subtitlesDetails: ", subtitlesDetails)
      }
    } catch (error) {
      console.error('Error fetching subtitles:', error);
    }

    console.log("subsDetails: ", subsDetails)

    //return;

    // Set transcodingStarted in task_data at the very beginning
    try {
      const currentTaskData = await sdk.entry.fields.task_data.getValue() || {};
      currentTaskData.transcodingStarted = true;
      await sdk.entry.fields.task_data.setValue(currentTaskData);
    } catch (error) {
      console.error('Error setting transcodingStarted in task_data:', error);
      return; // Exit the function if there's an error
    }

    // Function to initialize the Qencode API client
    const getAccessToken = async () => {
      try {
        // const qencodeApiClient = new QencodeApiClient(apikeyqencodeApiKey);

        const result = await QencodeApiRequest("access_token", {
          api_key: apikeyqencodeApiKey,
        });

        return result;
      } catch (error) {
        console.error('Error getting Qencode access token:', error);
        return null;
      }
    };

    // Function to create task
    const createTask = async (token) => {
      try {
        const result = await QencodeApiRequest("create_task", {
            token: token,
        });        

        return result;
      } catch (error) {
        console.error('Error creating Qencode task:', error);
        return null;
      }
    };

    // Function to start transcoding job
    const startTranscoding = async (task_token, queryJSON) => {
      try {        
        let result = await QencodeApiRequest("start_encode2", {
          task_token: task_token,
          query: queryJSON,
          payload: 'contentful'
        });        

        return result;
      } catch (error) {
        console.error('Error creating Qencode task:', error);
        return null;
      }
    };    
  
    const { error, message, token }  = await getAccessToken();
    console.log("access token: ", token)

    if (error !== 0 && message) {
      console.error("Error getting access token:", message);
      setError(message)
    }
  
    if (error === 0 && token) {
      // Rest of your transcoding logic
      for (let template of enabledTemplates) {
        console.log("Start transcoding job for template...")

        /////////////////////////////////////////////////////////

        const { error, task_token, message }  = await createTask(token);
        console.log("task_token: ", task_token)

        if (error !== 0 && message) {
          setError(message)
          setTranscodeFinished(false)
          setTranscodedStarted(false);
          setRetranscode(false);
        }

        if (error === 0 && task_token) {
          // start transcoding
          // https://www.radiantmediaplayer.com/media/big-buck-bunny-360p.mp4

          // transoding based on source file as url

          let query = JSON.parse(template.query);

          query.query.source = `https:${videoSrc}`;

          let uuid = uuidv4();

          // Assume subsDetails might be undefined, null, or an empty string
          let parsedSubsDetails = [];
          if (subsDetails && subsDetails !== "null" && subsDetails !== "") {
              // Parse subsDetails from a JSON string to an object, if necessary
              parsedSubsDetails = typeof subsDetails === 'string' ? JSON.parse(subsDetails) : subsDetails;
          }

          // Transform subsDetails to match the API's expected format for subtitles
          const subtitlesSources = parsedSubsDetails.map(sub => ({
            source: `https:${sub.fileUrl.startsWith('//') ? sub.fileUrl : `//${sub.fileUrl}`}`,
            language: sub.language
          }));       

          query.query.format = query.query.format.map(format => {
            let { destination } = format; // Changed to let for reassignment
            const { output, file_extension, image_format } = format;
            
            // Check if destination exists before trying to modify it
            if (destination) {
              if (typeof destination === "object" && destination.url) {
                // Check if destination is a single object and has a URL to modify
                destination.url = RandomizedFileName({
                  url: destination.url,
                  output,
                  file_extension,
                  image_format,
                  uuid
                });
              } else if (Array.isArray(destination)) {
                // Check if destination is an array of objects and modify each one
                destination = destination.map(item => {
                  if (item.url) {  // Ensure there is a URL to modify
                    return RandomizedFileName({
                      url: item.url,
                      output,
                      file_extension,
                      image_format,
                      uuid
                    });
                  }
                  return item;  // Return item unmodified if no URL is present
                });
              }
            }
          
            // Ensure that the destination changes are reflected in the original format object
            format.destination = destination;

            // Add subtitles to format if subsDetails is defined and not empty
            if (parsedSubsDetails && parsedSubsDetails.length > 0) {
              format.subtitles = {
                sources: subtitlesSources,  // Ensure subtitlesSources is defined outside this snippet
                copy: 0 // Assuming 'copy' is a required property; adjust as necessary
              };
            }
            
            return format;
          });
          

          // query.query.format = query.query.format.map((format) => {
          //   //let { destination } = format;
          //   let { destination, output, file_extension, image_format } = format;

          //   if (destination) {
          //     // destination can be object or can be array of objects
          //     if (typeof destination === "object") {
          //       //destination.url = RandomizedFileName(destination.url);
          //       destination.url = RandomizedFileName({
          //         url: destination.url,
          //         output, 
          //         file_extension, 
          //         image_format,
          //         uuid
          //       });                
          //     } else {
          //       // this is array of objects
          //       destination = destination.map((item) => {
          //         //item.url = RandomizedFileName(item.url);
          //         item.url = RandomizedFileName({
          //             url: item.url,
          //             output, 
          //             file_extension, 
          //             image_format,
          //             uuid
          //         });                  
          //         return item;
          //       });
          //     }
          //   }

            // // Add subtitles to format if subsDetails is defined and not empty
            // if (parsedSubsDetails.length > 0) {
            //   format.subtitles = {
            //     sources: subtitlesSources,
            //     copy: 0 // Assuming 'copy' is a required property; adjust as necessary
            //   };
            // }

          //   console.log("format: ", format)

          //   return format;
          // });

          //console.log("query: ", query)

          let queryJSON = JSON.stringify(query);

          console.log("queryJSON: ", queryJSON)

          const transcodingResult = await startTranscoding(task_token, queryJSON);
          console.log("transcodingResult: ", transcodingResult)

          let { status_url, error: transcodingError, message } = transcodingResult;

          if (transcodingError !== 0 && message) {
            setError(message)
            setTranscodedStarted(false);
            setRetranscode(false);
          }

          if (transcodingError === 0 && status_url) {
            // setTranscodingJobs
            const newTranscodingJob = {
                taskToken: task_token,
                statusUrl: status_url,
                templateName: template.name,
            }

            // Fetch the current task_data, update it, and set it back
            try {
              const currentTaskData = await sdk.entry.fields.task_data.getValue() || {};
              // Check if transcodingJobs is an array, if not initialize it
              currentTaskData.transcodingJobs = Array.isArray(currentTaskData.transcodingJobs) ? currentTaskData.transcodingJobs : [];
              // Add the new transcoding job
              currentTaskData.transcodingJobs.push(newTranscodingJob);

              // add video source
              currentTaskData.videoSrc = videoSrc
              
              // Set the updated task_data back to Contentful
              await sdk.entry.fields.task_data.setValue(currentTaskData);

              // Optionally, update the local state if necessary
              // setTranscodingJobs(prevJobs => [...prevJobs, newTranscodingJob]);
            } catch (error) {
                console.error('Error updating task_data with transcoding jobs:', error);
            }            

            // // Update the state to include the new transcoding job
            // setTranscodingJobs(prevJobs => [...prevJobs, newTranscodingJob]);
          }
        }



        ////////////////////////////////////////////////////////

      }
    }

  }, [apikeyqencodeApiKey, enabledTemplates, videoSrc, sdk.entry.fields.task_data, sdk.cma.asset, sdk.cma.entry, sdk.entry.fields.subs, sdk.cma.assetKey]);
  // }, [apikeyqencodeApiKey, enabledTemplates, videoSrc, subsDetails, sdk.entry.fields.task_data]);
  

  // starts transcoding task only when published the first time and triggered by not retranscode
  useEffect(() => {
    if (isPublished && !transcodedStarted && !retranscode) {
      console.log("Start transcoding...");
      startTranscodingForTemplates();
      // The 'transcodingStarted' will be set to true within startTranscodingForTemplates function
    }
  }, [isPublished, transcodedStarted, startTranscodingForTemplates, retranscode]);  
    
  // Fetching the initial value of task_data and setting transcodedStarted
  // New useEffect to monitor changes in task_data.transcodingStarted  
  useEffect(() => {
    async function fetchInitialTaskData() {
      const taskData = await sdk.entry.fields.task_data.getValue();
      console.log("taskData: ", taskData)
      updateTaskDataStates(taskData);
    }
  
    function updateTaskDataStates(taskData) {
      if (taskData && typeof taskData === 'object') {
        if ('transcodingStarted' in taskData) {
          setTranscodedStarted(taskData.transcodingStarted);
        }

        // if ('transcodeFinished' in taskData) {
        //   setTranscodeFinished(taskData.transcodeFinished);
        // }

        if ('transcodingFinished' in taskData) {
          setTranscodeFinished(taskData.transcodingFinished);
        }        

        if ('transcodingResults' in taskData) {
          console.log("taskData.transcodingResults: ", taskData.transcodingResults)
          setTranscodingResults(taskData.transcodingResults);
        }
            
        if ('error' in taskData) {
          setDuringTranscodingError(taskData.error);
        }
        if ('transcodingJobs' in taskData) {
          setTranscodingJobs(taskData.transcodingJobs);
        }
      }
    }
  
    fetchInitialTaskData();
  
    const detach = sdk.entry.fields.task_data.onValueChanged(updateTaskDataStates);
    return () => detach();
  }, [sdk.entry.fields.task_data]);
  

    // Function to update a specific field in task_data
    const updateTaskDataField = useCallback(async (fieldName, fieldValue) => {
      try {
        // Retrieve current task_data
        const currentTaskData = (await sdk.entry.fields.task_data.getValue()) || {};
        // Update the specified field
        currentTaskData[fieldName] = fieldValue;
  
        console.log(`Set ${fieldName} to ${fieldValue}`)
  
        // Save the updated task_data back to the entry
        await sdk.entry.fields.task_data.setValue(currentTaskData);
      } catch (error) {
        console.error('Error updating task_data field:', error);
      }
    }, [sdk]);
  

  const handleTranscodingComplete = useCallback(async (action) => {

    const { type, token, result } = action

    //console.log("result: ", result)

    // check if there is error
    try {
      const currentTaskData = await sdk.entry.fields.task_data.getValue() || {};

      // Take transcodeFinished value from sdk.entry.fields.task_data
      const error = currentTaskData.error;
      console.log("task token: ", token)
      if(error){
        console.log("Error in task_data")
        return;
      } 
    } catch (error) {
      console.log("error: ", error)
    }

    //const { type, token, result } = action;
  
    if (type !== "updateStatus") {
      // Handle other types or exit if not applicable
      return;
    }
  
    const { error, error_description } = result.statuses[token];
  
    // Handle error in task data
    if (error !== 0 && error_description) {
      console.error("Transcoding Error: ", error_description);
      await updateTaskDataField('error', error_description); // Assuming updateTaskDataField is a defined function to update specific fields
      return; // Exit if there's an error
    }

  
    // Proceed only if transcoding is not finished
    try {
      // Fetch the current task data
      const currentTaskData = await sdk.entry.fields.task_data.getValue() || {};

      // Take transcodeFinished value from sdk.entry.fields.task_data
      const transcodingFinished = currentTaskData.transcodingFinished;

      //console.log("transcodingFinished: ", transcodingFinished)

      if(!transcodingFinished){
        // Ensure transcodingResults is an array
        const transcodingResults = Array.isArray(currentTaskData.transcodingResults) ? currentTaskData.transcodingResults : [];


        // Find existing result index for the token
        const existingResultIndex = transcodingResults.findIndex(res => res.statuses && res.statuses[token]);

        // Update existing result or push new result based on existence check
        if (existingResultIndex >= 0) {
          transcodingResults[existingResultIndex] = result; // Update existing result
        } else {
          transcodingResults.push(result); // Add new result
        }        


        // problem when more than 1 template, results get duplicated
        // transcodingResults.push({ ...result });

        // Update task data
        currentTaskData.transcodingResults = transcodingResults;

        // remove error in case it was there from previos transoding
        //currentTaskData.error = '';

        // Check if all jobs are finished, assuming you have a way to determine this
        const allJobsFinished = transcodingResults.length === enabledTemplates.length; // Example condition

        if (allJobsFinished) {
          currentTaskData.transcodingFinished = true; // Mark transcoding as finished
        }

        // Save updated task data
        await sdk.entry.fields.task_data.setValue(currentTaskData);
      }

    } catch (error) {
      console.error('Error updating task data:', error);
    }
  }, [sdk.entry.fields.task_data, enabledTemplates, updateTaskDataField]);


  const Retranscode = useCallback(async () => {
    console.log("Retranscoding started.....");

    setRetranscode(true); 

    // clear error in task_data if it was there...
    // await updateTaskDataField('error', '');
  
    // Step 1: Reset `task_data` on Contentful
    try {
      console.log("Clean task_data")
      await sdk.entry.fields.task_data.setValue({});
  
      // Step 2: Reset local states related to transcoding
      setTranscodedStarted(false); // Indicates transcoding has not started
      setTranscodeFinished(false); // Indicates transcoding is not finished
      setTranscodingResults([]); // Clears any previous transcoding results
      setDuringTranscodingError(""); // Clears any error messages
      setError(null); // Clears general error state
      setTranscodingJobs([]); // Clears transcoding job details
      // setRetranscode(false); // Resets the retranscode flag
  
      // Step 3: Start Transcoding again
      console.log("....startTranscodingForTemplates.....")
      startTranscodingForTemplates();

    } catch (error) {
      console.error('Error resetting task_data:', error);
    }
  }, [sdk.entry.fields.task_data, startTranscodingForTemplates, setTranscodedStarted, setTranscodeFinished, setTranscodingResults, setDuringTranscodingError, setError, setTranscodingJobs, setRetranscode]);


  return (
    <div className={sidebarStyles.container}>

      {videoSrc ? (
        <div>
          {!transcodedStarted ? (
            <div>
              {!retranscode ? (
                <div>
                  { !enabledTemplates.length === 0 ? (
                    <div>No templates found, can't transcode</div>
                  ):(
                    <div>Transcoding will start on Publish</div>
                  )}                  
                </div>
              ) : (
                <div>Loading...</div>
              )}

              {error && (
                <div className={sidebarStyles.error}>
                  <span>Error:</span> {error}
                </div>
              )}

            </div>
          ) : (
            <div className={sidebarStyles.status}>
              <div className={sidebarStyles.statusProgress}>
                Completed tasks: {transcodingResults.length}/{transcodingJobs.length}
                {!transcodeFinished && (
                  <img
                    className={sidebarStyles.loader}
                    src={svgLoader}
                    alt="loading..."
                  />
                )}
              </div>
              {/* {
                duringTranscodingError &&
                <button
                  onClick={Retranscode}
                  className={sidebarStyles.roundBtn}
                >
                  Retranscode
                </button>
              } */}
              {transcodeFinished && enabledTemplates.length !== 0 && (
                <button
                  onClick={Retranscode}
                  className={sidebarStyles.roundBtn}
                >
                  Retranscode
                </button>
              )}           
            </div>
          )}
        </div>
      ) : (
        <div>No video to transcode</div>
      )}

      {transcodeFinished && !enabledTemplates.length === 0 && (
        <div>
          No templates found, can't transcode
        </div>
      )}   

      {
        // transcodeFinished
        transcodeFinished && !duringTranscodingError ? (
          <div className={sidebarStyles.completedMessage}>
            <img
              className={sidebarStyles.imgDone}
              src={imgDone}
              alt="Completed!"
            />
            All tasks completed
          </div>
        ) : (
          <div>
            {transcodingJobs.map((job, index) => {
              // https://www.radiantmediaplayer.com/media/big-buck-bunny-360p.mp4
              let { taskToken, statusUrl, templateName } = job;
              return (
                <div key={index}>
                  <Status
                    taskToken={taskToken}
                    statusUrl={statusUrl}
                    templateName={templateName}
                    onComplete={handleTranscodingComplete}
                  />
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
};

export default Sidebar;
