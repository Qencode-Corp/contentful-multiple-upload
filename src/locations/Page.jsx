import React, {useState, useCallback, useEffect} from 'react';
// import { Paragraph } from '@contentful/f36-components';
import { Form, FormControl, TextInput, Datepicker, Autocomplete, Stack, Radio, Heading, Paragraph, Flex, Card, Text, Spinner} from '@contentful/f36-components';
import { DoneIcon } from '@contentful/f36-icons';
import { /* useCMA, */ useSDK } from '@contentful/react-apps-toolkit';

import { v4 as uuidv4 } from "uuid";

//import { generateSignedUrl } from '../utils/sign-url'

import DragAndDropUpload from '../components/DragAndDropUpload';
import ProgressBar from '../components/ProgressBar';

import { RandomizedFileName } from '../utils/filenameUtils';
import { QencodeApiRequest } from '../services/api';

const Page = () => {
  const sdk = useSDK();

  /*
     To use the cma, inject it as follows.
     If it is not needed, you can remove the next line.
  */
  // const cma = useCMA();

  // Extract apikey and templates from parameters
  const { apikeyqencodeApiKey } = sdk.parameters.installation;
  const { templates } = sdk.parameters.installation;
  const { CMA_token } = sdk.parameters.installation;

  const CONTENT_TYPE_ID = 'qencodeTranscodedAsset'
  const FIELDS_TO_SHOW_TYPE_ID = 'fieldsToShow' 

  const [fieldsToUpdate, setFieldsToUpdate] = useState([]);

  // const handleChange = (id, newValue) => {
  //   setFieldsToUpdate(fieldsToUpdate.map(field => 
  //       field.id === id ? { ...field, value: newValue } : field
  //   ));
  // };

  const handleChange = (id, newValue) => {
    //console.log("newValue: ", newValue)
    // Determine if the new value should be converted to a number
    const fieldToUpdate = fieldsToUpdate.find(field => field.id === id);
    let convertedValue = newValue;
  
    // If the field type is Integer, try converting newValue to a number
    if (fieldToUpdate && fieldToUpdate.type === "Integer") {
      const parsedValue = parseInt(newValue);
      // Check if the parsedValue is a number before assigning
      convertedValue = isNaN(parsedValue) ? newValue : parsedValue;
    }

    // If the field type is Number, try converting newValue to a number
    if (fieldToUpdate && fieldToUpdate.type === "Number") {
      const parsedValue = parseFloat(newValue);
      // Check if the parsedValue is a number before assigning
      convertedValue = isNaN(parsedValue) ? newValue : parsedValue;
    }

    // If the field type is Date, try converting newValue to a date
    // if (fieldToUpdate && fieldToUpdate.type === "Date") {
    //   const parsedValue = newValue;
    //   convertedValue = parsedValue ? newValue : new Date();
    // }

    //console.log("convertedValue: ", convertedValue)


    // in case there is range of values
    // if (fieldToUpdate && fieldToUpdate.type === "Symbol" && fieldToUpdate.range && fieldToUpdate.range.length > 0 && fieldToUpdate.filteredRange) {
    //   const newFilteredRange = fieldToUpdate.range.filter((item) =>
    //     item.toLowerCase().includes(convertedValue.toLowerCase()),
    //   );
    // }
  
    // original
    // setFieldsToUpdate(fieldsToUpdate.map(field => 
    //   field.id === id ? { ...field, value: convertedValue } : field
    // ));


    setFieldsToUpdate(fieldsToUpdate.map(field => {
      // Check if this is the field to update and if it should filter the range
      if (field.id === id) {
        let updatedField = { ...field, value: convertedValue };
        
        // If the field has a range and it's a Symbol type, filter the range based on newValue
        if (field.type === "Symbol" && field.range && field.range.length > 0) {
          updatedField.filteredRange = field.range.filter(item =>
            item.toLowerCase().includes(convertedValue.toLowerCase())
          );
        }
  
        return updatedField;
      }
  
      return field;
    }));    
  };  

  // Filter templates where 'enabled' field is true
  const enabledTemplates = templates.filter(template => template.enabled === true);

  const [uploadProgress, setUploadProgress] = useState([]);

  const updateTaskData = useCallback(async (entryId, taskData) => {
    try {
      // Retrieve the current entry
      const currentEntry = await sdk.cma.entry.get({ entryId });
  
      // Update the `task_data` field
      currentEntry.fields.task_data = {
        'en-US': taskData, // Adjust locale as needed
      };
  
      // Update the entry in Contentful
      const updatedEntry = await sdk.cma.entry.update({
        entryId,
        version: currentEntry.sys.version, // Provide the current version
      }, currentEntry);
  
      console.log("Entry updated with task_data:", updatedEntry);
    } catch (error) {
      console.error('Error updating entry with task_data:', error);
    }
  },[sdk]);
  

  const startTranscodingForTemplates = useCallback(async (publishedEntry, videoSrc) => {
    console.log("apikeyqencodeApiKey: ", apikeyqencodeApiKey)
    console.log("videoSrc: ", videoSrc)

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

    // initialize task_data that will be added to entry
    let task_data = {
      transcodingStarted: true,
      videoSrc: videoSrc
    }

    const { error, message, token }  = await getAccessToken();
    console.log("access token: ", token)

    if (error !== 0 && message) {
      console.error("Error getting access token:", message);
      task_data.error = message
      // Update task_data field with the error message
      await updateTaskData(publishedEntry.sys.id, task_data);
      return; // Exit if there's an error
    }


    let transcodingJobs = []; // Temporary array to hold new transcoding jobs

    // all transcoding will be here
    if (error === 0 && token) {
      // Rest of your transcoding logic
      for (let template of enabledTemplates) {
        console.log("Start transcoding job for template...")

        /////////////////////////////////////////////////////////

        const { error, task_token, message }  = await createTask(token);
        console.log("task_token: ", task_token)

        if (error !== 0 && message) {
          task_data.error = message
          await updateTaskData(publishedEntry.sys.id, task_data);
          return;
        }

        if (error === 0 && task_token) {
          // start transcoding
          // https://www.radiantmediaplayer.com/media/big-buck-bunny-360p.mp4

          // transoding based on source file as url

          let query = JSON.parse(template.query);

          query.query.source = `https:${videoSrc}`;

          let uuid = uuidv4();    

          query.query.format = query.query.format.map((format) => {

            let { destination, output, file_extension, image_format } = format;

            if (destination) {
              // destination can be object or can be array of objects
              if (typeof destination === "object") {
                destination.url = RandomizedFileName({
                  url: destination.url,
                  output, 
                  file_extension, 
                  image_format,
                  uuid
                });                
              } else {
                // this is array of objects
                destination = destination.map((item) => {
                  item.url = RandomizedFileName({
                      url: item.url,
                      output, 
                      file_extension, 
                      image_format,
                      uuid
                  });                  
                  return item;
                });
              }
            }

            console.log("format: ", format)

            return format;
          });

          //console.log("query: ", query)

          let queryJSON = JSON.stringify(query);

          console.log("queryJSON: ", queryJSON)

          const transcodingResult = await startTranscoding(task_token, queryJSON);
          console.log("transcodingResult: ", transcodingResult)

          let { status_url, error: transcodingError, message } = transcodingResult;

          if (transcodingError !== 0 && message) {
            task_data.error = message
            await updateTaskData(publishedEntry.sys.id, task_data);
            return;
          }

          if (transcodingError === 0 && status_url) {
            // setTranscodingJobs
            const newTranscodingJob = {
                taskToken: task_token,
                statusUrl: status_url,
                templateName: template.name,
            }

            transcodingJobs.push(newTranscodingJob); // Add to temporary array

            // // Retrieve the current task_data, if it exists
            // let currentTaskData = publishedEntry.fields.task_data ? publishedEntry.fields.task_data['en-US'] : {};
            // currentTaskData.transcodingJobs = currentTaskData.transcodingJobs || [];
            // currentTaskData.transcodingJobs.push(newTranscodingJob);

            // // Update task_data field
            // await updateTaskData(publishedEntry.sys.id, currentTaskData);           

          }
        }


      }
  
      // After all jobs are processed, update task_data with the complete transcodingJobs array
      try {
        // let currentEntry = await sdk.cma.entry.get({ entryId: publishedEntry.sys.id });
        // let currentTaskData = currentEntry.fields.task_data ? currentEntry.fields.task_data['en-US'] : {};

        // // Merge existing transcodingJobs with new ones
        // const updatedTranscodingJobs = currentTaskData.transcodingJobs ? [...currentTaskData.transcodingJobs, ...transcodingJobs] : transcodingJobs;
        // currentTaskData.transcodingJobs = updatedTranscodingJobs;

        task_data.transcodingJobs = transcodingJobs;
        await updateTaskData(publishedEntry.sys.id, task_data);   

        // // Update the entry in Contentful
        // currentEntry.fields.task_data = { 'en-US': currentTaskData };
        // const updatedEntry = await sdk.cma.entry.update({
        //   entryId: publishedEntry.sys.id,
        //   version: currentEntry.sys.version, // It's important to provide the current version
        // }, currentEntry);

        //console.log("Entry updated with all transcodingJobs: ", updatedEntry);
      } catch (error) {
        console.error('Error updating entry with transcodingJobs:', error);
      } 

    }


  }, [apikeyqencodeApiKey, enabledTemplates, updateTaskData]);  


  const createAndPublishEntry = useCallback(async (publishedAsset) => {
    try {
      const entryProps = {
        fields: {
          title: {
            'en-US': publishedAsset.fields.title['en-US'],
          },
          media: {
            'en-US': {
              sys: {
                id: publishedAsset.sys.id,
                linkType: 'Asset',
                type: 'Link',
              },
            },
          },
          // Add other fields as needed
          // description: {
          //   'en-US': "Test description 2",
          // },
          // gated: {
          //   'en-US': true,
          // },
        },
      };

      // adding fields and values from user input
      // fieldsToUpdate.forEach(field => {
      //   entryProps.fields[field.id] = {'en-US': field.value};
      // });

      // // adding fields and values from user input
      // fieldsToUpdate.forEach(field => {
      //   if (field.value !== undefined) {
      //     entryProps.fields[field.id] = {'en-US': field.value};
      //   }
      // });

      // adding fields and values from user input
      fieldsToUpdate.forEach(field => {
        // Proceed if the value is defined
        if (field.value !== undefined) {
          // Check if range is undefined, or if the value is within the range
          if (!field.range || (field.range && field.range.includes(field.value))) {
            entryProps.fields[field.id] = {'en-US': field.value};
          }
        }
      });      
      

      const entry = await sdk.cma.entry.create({ contentTypeId: CONTENT_TYPE_ID }, entryProps);
      console.log("Entry created: ", entry);

      const publishedEntry = await sdk.cma.entry.publish({ entryId: entry.sys.id }, entry);
      console.log("Entry published: ", publishedEntry);

      // after entry is published, start transcoding and update task_data
      // const videoSrc = publishedAsset.fields.file["en-US"].url;
      // startTranscodingForTemplates(publishedEntry, videoSrc)

      return publishedEntry;
      // return {}
    } catch (error) {
      console.error('Error creating or publishing entry:', error);
    }
  },[sdk.cma.entry, fieldsToUpdate]);


  async function customUploadMethod(file, accessToken, spaceId, environmentId, onProgress) {
    // Define the URL for Contentful's upload API
    const uploadUrl = `https://upload.contentful.com/spaces/${spaceId}/uploads`;
  
    // Use XMLHttpRequest for upload to listen to progress events
    return new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl, true);
  
      // Set the Authorization header with the access token
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

      // Set the Content-Type header to application/octet-stream
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
  
      // Listen for progress events
      xhr.upload.onprogress = function(event) {
        if (event.lengthComputable) {
          let percentComplete = (event.loaded / event.total) * 100;
          let roundedPercentComplete = Math.round(percentComplete);
          console.log(`Upload progress: ${roundedPercentComplete}%`);
          onProgress(roundedPercentComplete); // Call the onProgress callback with the progress percentage
        }
      };
  
      // Handle the response
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Parse the JSON response
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } else {
          reject(new Error('Upload failed with status: ' + xhr.status));
        }
      };
  
      // Handle network errors
      xhr.onerror = function() {
        reject(new Error('Network error occurred during upload'));
      };
  
      // Send the request with the file data directly
      xhr.send(file);
    });
  }
  
  const handleFileChangeProgress = useCallback(async (files) => {
    // const files = event.target.files;
    if (files.length === 0) {
      console.error('No files selected');
      return;
    }

    setUploadProgress([]); // Reset upload progress state

    // Assume accessToken is retrieved from your app's configuration or installation parameters
    const accessToken = CMA_token
    const spaceId = sdk.ids.space; // SDK should provide space ID
    const environmentId = sdk.ids.environment; // SDK should provide environment ID

    //console.log("accessToken: ", accessToken)
    console.log("spaceId: ", spaceId)
    console.log("environmentId: ", environmentId)

    // return;

    Array.from(files).map(async (file, index) => {

      // Initialize progress for this file
      // setUploadProgress(prev => [...prev, { name: file.name, progress: 0, status: "uploading" }]);

      // setUploadProgress(prev => [...prev, {
      //   name: file.name,
      //   progress: 0,
      //   status: "uploading",
      //   assetCreated: false,
      //   assetProcessed: false,
      //   assetPublished: false,
      //   entryPublished: false,
      //   transcodingStarted: false
      // }]); 
      
      setUploadProgress(prev => [...prev, {
        name: file.name,
        progress: 0,
        status: "uploading",
        processingStatus: 'uploading media', // 'Asset Created', 'Asset Processed', 'Asset Published', 'Entry Published', 'Transcoding Started'
        processingFinished: false
      }]);       

      try {
        // Step 1: Create Upload

        // Replace the following with a method that supports progress tracking
        // and uses the access token for authorization
        // const upload = await customUploadMethod(file, accessToken, spaceId, environmentId);        

        // Use customUploadMethod with progress callback
        const upload = await customUploadMethod(file, accessToken, spaceId, environmentId, (progress) => {
          // Update progress state for this file
          setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, progress } : item));
        });        

        console.log("upload: ", upload);

        // After successful upload, update status to "completed"
        // setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, status: "completed" } : item));
        setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, processingStatus: "upload completed" } : item));

        //return;

        const uploadId = upload.sys.id;
        console.log("uploadId: ", uploadId);

        // Step 2: Create an Asset linking to the Upload
        const assetProps = {
          fields: {
            title: {
              'en-US': file.name,
            },
            file: {
              'en-US': {
                fileName: file.name,
                contentType: file.type,
                uploadFrom: {
                  sys: {
                    type: "Link",
                    linkType: "Upload",
                    id: uploadId,
                  },
                },
              },
            },
          },
        };

        const asset = await sdk.cma.asset.create({}, assetProps);
        console.log("Asset created: ", asset);

        // setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, assetCreated: true } : item));
        setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, processingStatus: "asset created" } : item));


        // Step 3: Process the asset for a specific locale
        const processedAsset = await sdk.cma.asset.processForLocale({}, asset, 'en-US');
        console.log("processedAsset: ", processedAsset);

        // setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, assetProcessed: true } : item));
        setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, processingStatus: "asset processed" } : item));


        // Step 4: Publish the processed asset
        const publishedAsset = await sdk.cma.asset.publish({
          assetId: processedAsset.sys.id,
        }, {
          sys: processedAsset.sys,
          assetProps: assetProps
        });        
        console.log("Asset published: ", publishedAsset);

        // setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, assetPublished: true } : item));
        setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, processingStatus: "asset published" } : item));


        // create and publish entry, transcoding starts there
        const publishedEntry = await createAndPublishEntry(publishedAsset);

        return;


        if(publishedEntry){
          console.log('Published Entry:', publishedEntry);

          // setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, entryPublished: true } : item));
          setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, processingStatus: "entry published" } : item));

          // start transcoding after asset is published
          const videoSrc = publishedAsset.fields.file["en-US"].url;
          startTranscodingForTemplates(publishedEntry, videoSrc)

          // setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, transcodingStarted: true } : item));
          setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, processingStatus: "transcoding started" } : item));
        } else {
          console.error(`Failed to upload and publish entry`);
        }



      } catch (error) {
        console.error(`Failed to upload and publish asset: ${file.name}`, error);

        // On error, update status to "failed"
        // setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, status: "failed" } : item));
        setUploadProgress(prev => prev.map((item, idx) => idx === index ? { ...item, status: "failed", processingStatus: "failed" } : item)); 
               

        return null; // Return null in case of error
      }
    });
  }, [sdk.cma.asset, sdk.ids, createAndPublishEntry, CMA_token, startTranscodingForTemplates]);    


  // Wrap the fetch function with useCallback to memoize it
  const fetchContentTypeFields = useCallback(async () => {
    try {

      // get fiels that user wants to update from specific content type
      let contentTypeId = FIELDS_TO_SHOW_TYPE_ID;
      let contentType = await sdk.cma.contentType.get({contentTypeId});
      const fieldsToShowList = contentType.fields

      //console.log('fieldsToShowList:', fieldsToShowList);

      // get all fields in main content type
      contentTypeId = CONTENT_TYPE_ID;
      contentType = await sdk.cma.contentType.get({contentTypeId});
      const allFieldsList = contentType.fields

      console.log(`allFieldsList: `, allFieldsList);

      // Extract IDs from the first list
      const idsFieldsToShow = new Set(fieldsToShowList.map(item => item.id));

      // Filter the second list based on matching IDs
      const filteredList = allFieldsList.filter(item => idsFieldsToShow.has(item.id))
      .map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        value: item.defaultValue ? item.defaultValue["en-US"] : undefined,
        range: item.validations?.find(validation => validation.in)?.in,
        filteredRange: item.validations?.find(validation => validation.in)?.in
      }));

        //value: item.defaultValue ? item.defaultValue["en-US"] : (item.type === "Date" ? new Date() : (item.type === "Symbol" ? "" : false))
        //value: item.defaultValue ? item.defaultValue["en-US"] : ''
        //value: item.defaultValue && item.defaultValue["en-US"] !== undefined ? item.defaultValue["en-US"] : (item.type === "Symbol" ? "" : false)

      // get only fields from main content type specidied in content type used as filter
      console.log("filteredList: ", filteredList)
      setFieldsToUpdate(filteredList)

    } catch (error) {
      console.error('Error fetching content type fields:', error);
    }
  }, [sdk]); // Add sdk as a dependency

  // Use useEffect to call the fetch function on component mount
  useEffect(() => {
    fetchContentTypeFields();
  }, [fetchContentTypeFields]);
 
  return (
    <div>
      {/* <input type="file" multiple onChange={handleFileChangeProgress} /> */}

      <Flex>
        <Flex flexDirection='column' padding='spacingL'>
          <Heading>Multiple media upload</Heading>
          <Paragraph>
            Here you can upload multiple media assets. Content for Qencode app will be created based on those media assets 
            and transcoding will be initiated based on selected Transcoding Templates
          </Paragraph>

          <Form>
            <FormControl>
              <DragAndDropUpload onFilesAdded={handleFileChangeProgress} />
            </FormControl>
          </Form>   

          <Flex flexDirection="row" gap="spacingS" flexWrap="wrap">
            {uploadProgress.map(file => (
                <Card key={file.name} style={{ marginBottom: '20px', width: "250px", minWdth: "250px" }}>
                    <div
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}    
                    >
                      <strong>{file.name}</strong>
                    </div> 
                    {/* <div>Progress: {file.progress}%</div> */}
                    <ProgressBar progress={file.progress} />
                    {/* <div>File upload: {file.status}</div> */}

                    <Flex justifyContent="space-between" alignItems="center">
                      <Text marginRight="spacingXs">Status: {file.processingStatus}</Text>
                      {
                        (file.processingStatus !== "transcoding started") && (file.processingStatus !== "failed") &&
                        <Spinner size="small" />
                      }
                      { file.processingStatus === "transcoding started" && <DoneIcon />}               
                    </Flex> 
                </Card>
            ))}         
          </Flex >

        </Flex>
        <Flex flexDirection='column' padding='spacingL' style={{minWidth:"240px"}}>
          <Heading>Fields</Heading>
          <Paragraph>
            Values will be applied to all entries
          </Paragraph>
          <Form>
              {fieldsToUpdate.map(field => (
                  <div key={field.id}>
                      {field.type === 'Symbol' && !field.range && (
                          <FormControl>
                              <FormControl.Label>{field.name}</FormControl.Label>
                              <TextInput 
                                  type="text"
                                  value={field.value ? field.value : ''}
                                  onChange={(e) => handleChange(field.id, e.target.value)}
                              />
                          </FormControl>
                      )}
                      {field.type === 'Symbol' && field.range && (field.range.length > 0) && (
                          <FormControl>
                              <FormControl.Label>{field.name}</FormControl.Label>
                              <Autocomplete
                                items={field.filteredRange}
                                onInputValueChange={(value) => handleChange(field.id, value)}
                                onSelectItem={(value) => handleChange(field.id, value)}
                              />
                          </FormControl>
                      )}                      
                      {field.type === 'Integer' && (
                          <FormControl>
                              <FormControl.Label>{field.name}</FormControl.Label>
                              <TextInput 
                                  type="number"
                                  value={field.value ? field.value : ''}
                                  onChange={(e) => handleChange(field.id, e.target.value)}
                              />
                          </FormControl>
                      )}
                      {field.type === 'Boolean' && (
                          <FormControl>
                              <FormControl.Label>{field.name}</FormControl.Label>
                              <Stack flexDirection="row">
                                <Radio
                                  name={field.id}
                                  value={field.value === true}
                                  isChecked={field.value === true}
                                  onChange={() => handleChange(field.id, true)}
                                >
                                  Yes
                                </Radio>
                                <Radio
                                  name={field.id}
                                  value={field.value === false}
                                  isChecked={field.value === false}
                                  onChange={() => handleChange(field.id, false)}
                                >
                                  No
                                </Radio>
                              </Stack>         
                          </FormControl>
                      )}
                      {field.type === 'Number' && (
                          <FormControl>
                              <FormControl.Label>{field.name}</FormControl.Label>
                              <TextInput 
                                  type="number"
                                  value={field.value ? field.value : ''}
                                  onChange={(e) => handleChange(field.id, e.target.value)}
                              />
                          </FormControl>
                      )}
                      {field.type === 'Date' && (
                          <FormControl>
                              <FormControl.Label>{field.name}</FormControl.Label>
                              {/* <Datepicker 
                                  selected={field.value ? new Date(field.value) : new Date()}  
                                  //selected={new Date(field.value)}                          
                                  onSelect={(value) => handleChange(field.id, value)}
                              /> */}
                            <Datepicker
                              selected={field.value ? new Date(field.value) : null}
                              placeholderText="Select a date"
                              onSelect={(date) => handleChange(field.id, date)}
                            />                              
                          </FormControl>
                      )}                      
                  </div>
              ))}              
          </Form>
        </Flex>
      </Flex>




    </div>
  );
};

export default Page;


// import React from 'react';
// import { Paragraph } from '@contentful/f36-components';
// import { /* useCMA, */ useSDK } from '@contentful/react-apps-toolkit';

// const Page = () => {
//   const sdk = useSDK();
//   /*
//      To use the cma, inject it as follows.
//      If it is not needed, you can remove the next line.
//   */
//   // const cma = useCMA();

//   return <Paragraph>Hello Page Component (AppId: {sdk.ids.app})</Paragraph>;
// };

// export default Page;
