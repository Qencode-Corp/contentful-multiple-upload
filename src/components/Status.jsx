import React, { useState, useEffect, useCallback } from 'react'

import statusStyles from "./Status.module.css"

import queryString from 'query-string'

import errorIcon from "../images/error.png";

import Error from "./Error";

const Status = ({taskToken, statusUrl, templateName, onComplete}) => {

    //console.log("taskToken: ", taskToken);

    const [lastStatusUrl, setLastStatusUrl] = useState(statusUrl)

    const [progress, setProgress] = useState(0)

    const [taskComplete, setTaskComplete] = useState(false)

    const [transcodingStatus, setTranscodingStatus] = useState('')

    const [transcodingError, setTranscodingError] = useState();    

    const getStatus = useCallback(async () => {

        const QencodeApiGetStatus = async (data) => {

          let requestData = queryString.stringify(data)

          let response = await fetch(`${lastStatusUrl}`, {
              method: 'POST',
              headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: requestData
          })

          let result = await response.json();

          return result   
        }  

        let result = await QencodeApiGetStatus( { task_tokens: taskToken })

        let status_url = result.statuses[taskToken].status_url
        let progress = result.statuses[taskToken].percent
        let status = result.statuses[taskToken].status

        setLastStatusUrl(status_url)
        setProgress(progress)
        setTranscodingStatus(status)

        if(status === "completed"){
            setTaskComplete(true)

            onComplete({
                type:'updateStatus',
                token: taskToken,
                result: result
            })               
        }

        let { error, error_description } = result.statuses[taskToken];
        if (error !== 0 && error_description) {
          //console.log("ERROR inside SIDEBAR: ", error_description);
          setTranscodingError(error_description);
        }
    }, [taskToken, lastStatusUrl, onComplete]); // Add any other dependencies that getStatus relies on

    // call get status on component load
    useEffect(() => {
        getStatus()   
    }, [getStatus]);   

    // call get status every 5 seconds
    // useEffect(() => {
    //   //console.log("taskComplete: ", taskComplete);
    //   if (!taskComplete) {
    //     const interval = setInterval(() => getStatus(), 5000);
    //     return () => {
    //       clearInterval(interval);
    //     };
    //   }
    // }, [taskComplete, getStatus]);    

    // Call getStatus every 5 seconds, but stop if the task is complete or an error occurred
    useEffect(() => {
      if (!taskComplete && !transcodingError) { // Add !transcodingError to the condition
          const interval = setInterval(() => getStatus(), 5000);
          return () => clearInterval(interval);
      }
    }, [taskComplete, transcodingError, getStatus]); // Add transcodingError to the dependency array


    return (
      <div className={statusStyles.container}>
        <div
          className={
            taskComplete
              ? `${statusStyles.content} ${statusStyles.completed}`
              : statusStyles.content
          }
        >
          <div className={statusStyles.templateName}>
            {templateName} <span>/ {transcodingStatus}</span>
          </div>

          {transcodingError && (
            <img
              className={statusStyles.errorIcon}
              src={errorIcon}
              alt="Error!"
            />
          )}

          {!transcodingError ? (
            <div className={statusStyles.progressContainer}>
              <div className={statusStyles.progressBar}>
                <div
                  className={statusStyles.loaded}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <div className={statusStyles.progress}>
                {Math.round(progress)}%
              </div>
            </div>
          ) : (
            <Error message={transcodingError} />
          )}
        </div>
      </div>
    );

};

export default Status;