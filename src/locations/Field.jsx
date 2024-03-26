import React, { useState, useEffect, useRef, 
  //useCallback 
} from 'react';

import { useSDK } from '@contentful/react-apps-toolkit';
import fieldStyles from "./Field.module.css";


import { qPlayer } from 'qplayer-npm';

// import { SignJWT, importJWK, jwtVerify } from 'jose';
import { generateSignedUrl } from '../utils/sign-url'

const Field = () => {
  const sdk = useSDK();

  // console.log("Qencode Contentul. v2024_2_6_16:51")
  // console.log("Qencode Contentul. v2024_2_7_13:49")
  // console.log("Qencode Contentul. v2024_2_8_11:45")
  // console.log("Qencode Contentul. v2024_2_8_15:29")
  // console.log("Qencode Contentul. v2024_2_15_14:14")
  console.log("Qencode Contentul. v2024_2_21_14:42")

  // const [videoSrc, setVideoSrc] = useState(localStorage.getItem('videoSrc') || null);
  const [videoSrc, setVideoSrc] = useState(null);
  // const [subsDetails, setSubsDetails] = useState(localStorage.getItem('subsDetails') || null);
  //const [subsDetails, setSubsDetails] = useState(null);

  const [previewVideoSrc, setPreviewVideoSrc] = useState(null);


  // to deal with cases when media asset has different videos for different languages
  const [ videoSrcLanguages, setVideoSrcLanguages ] = useState([])

  // this includes source video and links to videos created as result of transcoding
  const [ videosSummaryList, setVideosSummaryList] = useState([]) 

  // dealing with video 

  useEffect(() => {
    //console.log("Hande local storage for videoSrc: ", videoSrc)
    if (!videoSrc) {
      localStorage.removeItem('videoSrc');
    } else {
      localStorage.setItem('videoSrc', videoSrc);
    }
  }, [videoSrc]);
  
  // this doesn't work when new video is uploaded
  // useEffect(() => {
  //   if (sdk?.entry?.fields?.media) {
  //     const detach = sdk.entry.fields.media.onValueChanged(async (asset) => {
  //       console.log("asset: ", asset)
  //       if (asset) {
  //         try {
  //           const id = asset.sys.id;
  //           const assetDetails = await sdk.cma.asset.get({ assetId: id });
  //           const languages = Object.keys(assetDetails.fields.file);

  //           // here we check if video asset has different videos 
  //           // and we need to show user dropdown to select video source based on selected language
  //           if(languages.length > 1){
  //             let multilanguageVideos = []
    
  //             languages.forEach(lang => {
  //               multilanguageVideos.push({
  //                 lang: lang,
  //                 url: assetDetails.fields.file[`${lang}`].url           
  //               })
  //             })  

  //             //console.log("multilanguageVideos: ", multilanguageVideos)
    
  //             setVideoSrcLanguages(multilanguageVideos)
  //           }


  //           const defaultLanguage = languages[0];
  //           const url = assetDetails.fields.file[defaultLanguage].url;

  //           // setVideoSrc(url.startsWith('//') ? `https:${url}` : url);    
  //           setVideoSrc(url);             
  //         } catch (error) {
  //           console.error('Error fetching asset:', error);
  //         }
  //       } else {
  //         localStorage.removeItem("options");  
  //         setVideoSrc(null);
  //       }
  //     });

  //     return () => detach();
  //   }
  // }, [sdk]);

  useEffect(() => {
  
    if (sdk?.entry?.fields?.media) {
      const detach = sdk.entry.fields.media.onValueChanged((asset) => {
        //console.log("asset: ", asset);
        if (asset) {
          const checkAssetPublished = async (id) => {
            try {
              // Polling mechanism to wait for the asset to be published
              const waitForAssetPublished = (resolve, reject) => {
                setTimeout(async () => {
                  try {
                    const assetDetails = await sdk.cma.asset.get({ assetId: id });

                    if (assetDetails.sys.publishedVersion) {
                      resolve(assetDetails);
                    } else {
                      waitForAssetPublished(resolve, reject);
                    }
                  } catch (error) {
                    reject(error);
                  }
                }, 1000); // Check every 1 second
              };
  
              return new Promise(waitForAssetPublished);
            } catch (error) {
              console.error('Error checking asset publication status:', error);
            }
          };
  
          const id = asset.sys.id;
          checkAssetPublished(id).then( async (assetDetails) => {
            const languages = Object.keys(assetDetails.fields.file);
  
            // Process asset details after it's confirmed to be published
            if (languages.length > 1) {
              let multilanguageVideos = [];
              languages.forEach(lang => {
                multilanguageVideos.push({
                  lang: lang,
                  url: assetDetails.fields.file[lang].url           
                });
              });
  
              setVideoSrcLanguages(multilanguageVideos);
            }
  
            const defaultLanguage = languages[0];
            const url = assetDetails.fields.file[defaultLanguage].url;

            console.log("Url found: ", url)

            // step 1, check if asset is embargoed asset

            const isEmbargoed = url.startsWith('https://images.secure.ctfassets.net') ||
            url.startsWith('https://assets.secure.ctfassets.net') ||
            url.startsWith('https://videos.secure.ctfassets.net') ||
            url.startsWith('https://downloads.secure.ctfassets.net');     

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

                const signedUrl = await generateSignedUrl(policy, secret, url, expiresAtMs);
                // Use the signed URL as needed

                setVideoSrc(signedUrl);
                localStorage.setItem('videoSrc', signedUrl);  

              } catch (error) {
                  console.error('Error generating signed URL:', error);
              }              

            } else {
              setVideoSrc(url);
              localStorage.setItem('videoSrc', url);   
            }    


          }).catch(console.error);
        } else {
          localStorage.removeItem("options");  
          localStorage.removeItem('videoSrc');
          setVideoSrc(null);
        }
      });
  
      return () => detach();
    }
  }, [sdk]);
  



  // WORKS but doesn't detect when updating language field
  // to handle situation when new file is added 
  // no need since aproached changed
  // useEffect(() => {
  //   if (sdk?.entry?.fields?.subs) {
  //     const detach = sdk.entry.fields.subs.onValueChanged((subs) => {
  //       if (subs) {
  //         Promise.all(subs.map(async (subEntry) => {
  //           // Define the function to wait for the subtitle asset to be published
  //           const checkSubEntryPublished = async (id) => {
  //             const waitForSubEntryPublished = (resolve, reject) => {
  //               setTimeout(async () => {
  //                 try {
  //                   const entry = await sdk.cma.entry.get({ entryId: id });
  //                   if (entry.sys.publishedVersion) {
  //                     resolve(entry);
  //                   } else {
  //                     waitForSubEntryPublished(resolve, reject);
  //                   }
  //                 } catch (error) {
  //                   reject(error);
  //                 }
  //               }, 500); // Check every 0.5 second
  //             };
  //             return new Promise(waitForSubEntryPublished);
  //           };

  //           // Wait for the subtitle entry to be published
  //           return checkSubEntryPublished(subEntry.sys.id).then(async (entry) => {
  //             // Proceed only if the file field is present
  //             if (entry.fields.file) {
  //               const languages = Object.keys(entry.fields.file);
  //               const defaultLanguage = languages[0];
  //               const assetId = entry.fields.file[defaultLanguage]?.sys?.id;

  //               // give warning to user in case language field is not present
  //               if (assetId) {
  //                 const asset = await sdk.cma.asset.get({ assetId });
  //                 const fileUrl = asset.fields.file[defaultLanguage].url;

  //                 // Check if the 'language' field is present in the entry
  //                 if (!entry.fields.language || !entry.fields.language[defaultLanguage]) {
  //                   console.warn(`Warning: 'language' field is missing for subtitle entry with ID ${subEntry.sys.id}. This field is required.`);
  //                   return { language: null, fileUrl: null };
  //                 }

  //                 return {
  //                   language: entry.fields.language[defaultLanguage],
  //                   fileUrl: fileUrl
  //                 };
  //               }
  //             }
  //             return { language: null, fileUrl: null };
  //           }).catch(console.error);
  //         })).then((fetchedSubsDetails) => {
  //           // Filter out any details where the file URL could not be determined
  //           const validSubsDetails = fetchedSubsDetails.filter(detail => detail.fileUrl !== null);
  //           setSubsDetails(JSON.stringify(validSubsDetails));
  //           localStorage.setItem('subsDetails', JSON.stringify(validSubsDetails));
  //         });
  //       } else {
  //         localStorage.removeItem('subsDetails');
  //         setSubsDetails(null);
  //       }
  //     });

  //     return () => detach();
  //   }
  // }, [sdk]);



  // Some video media asset may have 2 or move videos based on number of languages
  // but we need to choose one video source 
  const handleMultiLangVideoChange  = async (event) => {
    let options = JSON.parse(event.target.value); 
    // let {url, lang} = options
    let {url} = options

    localStorage.setItem("options", event.target.value);    

    // setVideoSrc(url.startsWith('//') ? `https:${url}` : url);
    setVideoSrc(url); 
    //localStorage.setItem('videoSrc', url);   
  }  

  // track changes to task_data field
  useEffect(() => {
    if (sdk?.entry?.fields?.task_data) {
      const detach = sdk.entry.fields.task_data.onValueChanged(async (asset) => {
        if (asset) {
          //console.log("task_data: ", asset)
          // get task_data fields
          const { transcodingResults, transcodingFinished } = asset
          // console.log("transcodingResults: ", transcodingResults)
          // console.log("transcodingFinished: ", transcodingFinished)

          // if transcoded finished and there are transcoding resunts
          // set videosSummaryList, setVideosSummaryList
          if(transcodingFinished && transcodingResults.length > 0){
            // add transcoding videos to the list
            console.log("add transcoded videos to the list of videos")

            let updatedVideosSummaryList = []
      
            transcodingResults.forEach((result) => {
              let { error } = result
              
              if(error === 0 && result.statuses){
                let { statuses } = result
                for (let jobID in statuses) {
                  let statusData = statuses[jobID]
                  
                  if(statusData.status === 'completed' && statusData.videos){
                    let { videos } = statusData
                    // console.log("videos: ", videos)
                    // 1280х260 | h.264 | mp4 
                    
                    videos.forEach((video) => {
                      let summary = { data: '', url: ''}
      
                      if(video.meta){
                        let { meta } = video
                        let { width, height, codec } = meta
                        summary.data += `${width}x${height} | ${codec}`
                      }                
      
                      if(video.output_format){
                        summary.data += ` | ${video.output_format}`
                      }
      
                      if(video.url){
                        let { url } = video
                        summary.url = url
                      }                       
                                
      
                      updatedVideosSummaryList.push(summary)
      
                    });
      
      
                  }
      
                }
              }
            });

            console.log("Setting the Summary List.... ", updatedVideosSummaryList)
            setVideosSummaryList(updatedVideosSummaryList)


          }

        } else {
          console.log("task_data field not found...")
        }
      });

      return () => detach();
    }
  }, [sdk]);

  // handle situations when transcoding finished and there are many videos in dropdown
  // so we give user ability to see transcoded videos by resetting player
  const handleVideoChange = (event) => {
    console.log("Selected video for preview changed: ", event.target.value)
    const newPreviewUrl = event.target.value;
    setPreviewVideoSrc(newPreviewUrl);
  }  


  // dealing with player...

  // Use a ref for the player instance ID
  const playerInstanceId = useRef(undefined);

  useEffect(() => {
    console.log("videoSrc: ", videoSrc)

    // Function to update the iframe height
    const updateHeight = () => {
      sdk.window.updateHeight(); // Automatically adjust to content height
    };

    const deletePlayer = () => {
      if (window.qencodePlayers && window.qencodePlayers[playerInstanceId.current]) {
        window.qencodePlayers[playerInstanceId.current].dispose();
        delete window.qencodePlayers[playerInstanceId.current];
      }
    };

    if (videoSrc) {
      // Delete existing player instance if any
      deletePlayer();

      // Parameters for initiating player
      let params = {
        licenseKey: 'f223fb50-8d26-6b9e-637c-eb62a5e79edb', // Replace with your license key
        videoSources: { src: videoSrc }
      };

      // Initiate player
      qPlayer("player", params, function () {
        console.log("Player initiated");
        playerInstanceId.current = this._instanceId;

        // Update height after player is initiated
        setTimeout(updateHeight, 500); // Adjust the timeout as needed
      });
    } else {
      // If no video source, delete the player
      deletePlayer();
      // Update height after player is deleted
      setTimeout(updateHeight, 500); // Adjust the timeout as needed
    }

    // Cleanup function to delete player when component unmounts or videoSrc changes
    return () => deletePlayer();
  }, [videoSrc, sdk.window]); 

  useEffect(() => {
    console.log("Preview videoSrc: ", previewVideoSrc);

    const updateHeight = () => {
        sdk.window.updateHeight(); // Automatically adjust to content height
    };

    const deletePlayer = () => {
        if (window.qencodePlayers && window.qencodePlayers[playerInstanceId.current]) {
            window.qencodePlayers[playerInstanceId.current].dispose();
            delete window.qencodePlayers[playerInstanceId.current];
        }
    };

    if (previewVideoSrc) {
        deletePlayer();

        let params = {
            licenseKey: 'f223fb50-8d26-6b9e-637c-eb62a5e79edb',
            videoSources: { src: previewVideoSrc }
        };

        qPlayer("player", params, function () {
            console.log("Player initiated with new src");
            playerInstanceId.current = this._instanceId;
            setTimeout(updateHeight, 500);
        });
    } else {
        deletePlayer();
        setTimeout(updateHeight, 500);
    }

    return () => deletePlayer();
  }, [previewVideoSrc, sdk.window]);


  return (
    <div className={fieldStyles.container}>
      {
        videoSrcLanguages && videoSrcLanguages.length > 1 &&
        <section className={fieldStyles.multilanguage}>
          <select 
            onChange={handleMultiLangVideoChange}
          >
            {videoSrcLanguages.map((video, index) => {
              let { url, lang } = video;
              return (
                <option key={index} value={JSON.stringify({url, lang})}>{lang}</option>
              );
            })}
          </select> 
        </section>        
      } 
  
      <section>
        <div>
          {/* Drop down with videos, more added after transcoded */}
          {videoSrc && (
            <select 
              onChange={handleVideoChange}
            >
              {/* <option value={"https:"+videoSrc}>Source Video</option> */}
              <option value={videoSrc}>Source Video</option>
              {videosSummaryList.map((video, index) => {
                let { url, data } = video;
                return (
                  <option key={index} value={url}>{data}</option>
                );
              })}
            </select>
          )}
  
          <div className={fieldStyles.player} id="player"></div>
          
          {!videoSrc && (
            <div>Once video is uploaded, you can preview it here...</div>
          )}
        </div>
      </section>

    </div>
  );
  

};

export default Field;



