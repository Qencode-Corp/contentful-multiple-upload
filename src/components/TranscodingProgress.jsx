import React, { useEffect, useState, useCallback } from 'react';
import { Spinner} from '@contentful/f36-components';
import { DoneIcon } from '@contentful/f36-icons';
import ProgressBar from '../components/ProgressBar';
import queryString from 'query-string';

import transcodingStyles from "./TranscodingProgress.module.css"

const TranscodingProgress = ({ transcodingJobs }) => {
  const [jobsProgress, setJobsProgress] = useState(transcodingJobs.map(job => ({
    ...job,
    status: 'pending', // Initial status
    percent: 0,
    finished: false,
    statusUrl: job.statusUrl // Use the initial statusUrl from the job
  })));

  const getTranscodingStatus = useCallback(async (job) => {
    const data = { task_tokens: job.taskToken };
    const requestData = queryString.stringify(data);

    let response = await fetch(job.statusUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: requestData
    });
    let result = await response.json();

    return result;
  }, []);

  const updateJobProgress = useCallback((index, updates) => {
    setJobsProgress(prev => prev.map((job, idx) => idx === index ? {...job, ...updates} : job));
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      jobsProgress.forEach(async (job, index) => {
        if (!job.finished) { // Only fetch status if not finished
          try {
            const result = await getTranscodingStatus(job);
            const statusDetails = result.statuses[job.taskToken];

            if (statusDetails.error !== 0) {
              // Handle error case
              updateJobProgress(index, {
                status: statusDetails.status,
                percent: statusDetails.percent,
                error: true,
                errorMessage: statusDetails.error_description || 'Unknown error',
                finished: true
              });
            } else {
              // Update job details, including potentially updated statusUrl
              updateJobProgress(index, {
                status: statusDetails.status,
                percent: statusDetails.percent,
                finished: statusDetails.status === 'completed',
                statusUrl: statusDetails.status_url || job.statusUrl // Update the statusUrl if provided
              });
            }
          } catch (error) {
            console.error(`Error fetching transcoding status for token ${job.taskToken}:`, error);
            // Update as error in UI
            updateJobProgress(index, {
              error: true,
              errorMessage: 'Failed to fetch status',
              finished: true
            });
          }
        }
      });
    }, 5000); // Update status every 5 seconds

    return () => clearInterval(intervalId);
  }, [jobsProgress, getTranscodingStatus, updateJobProgress]); // Ensure effect runs with updated state

  return (
    <div className={transcodingStyles.container}>
      {jobsProgress.map((job, index) => (
        <div key={index}>
            <div className={transcodingStyles.header}>
                <div>
                    Template: <strong>{job.templateName}</strong> 
                </div>   

                <ProgressBar progress={job.percent} />

                <div>
                    Job ID: <strong>{job.taskToken}</strong>
                </div>
                
                
            </div>
            <div className={transcodingStyles.jobStatus}>
                <div>
                    Job status: <span>{job.status}</span>
                </div>               

                {
                    (job.status !== "completed" || job.error === 0) && <Spinner size="small" />
                }
                

                { job.status === "completed" && <DoneIcon /> } 
            </div>
          
            {job.error && <div className={transcodingStyles.error}>Error: {job.errorMessage}</div>}
        </div>
      ))}
    </div>
  );
};

export default TranscodingProgress;



// import React, { useEffect, useState } from 'react';
// import queryString from 'query-string';

// const TranscodingProgress = ({ transcodingJobs }) => {
//   const [jobsProgress, setJobsProgress] = useState(transcodingJobs.map(job => ({
//     ...job,
//     status: 'pending', // Initial status
//     percent: 0,
//     finished: false
//   })));

//   useEffect(() => {
//     const intervalId = setInterval(() => {
//       jobsProgress.forEach(async (job, index) => {
//         if (!job.finished) { // Only fetch status if not finished
//           try {
//             const data = { task_tokens: job.taskToken };
//             const result = await getTranscodingStatus(data, job.statusUrl);
//             const statusDetails = result.statuses[job.taskToken];

//             if (statusDetails.error !== 0) {
//               // Handle error case
//               updateJobProgress(index, {
//                 error: true,
//                 errorMessage: statusDetails.error_description || 'Unknown error',
//                 finished: true
//               });
//             } else {
//               // Update job details
//               updateJobProgress(index, {
//                 status: statusDetails.status,
//                 percent: statusDetails.percent,
//                 finished: statusDetails.status === 'completed'
//               });
//             }
//           } catch (error) {
//             console.error(`Error fetching transcoding status for token ${job.taskToken}:`, error);
//             // Update as error in UI
//             updateJobProgress(index, {
//               error: true,
//               errorMessage: 'Failed to fetch status',
//               finished: true
//             });
//           }
//         }
//       });
//     }, 10000); // Update status every 10 seconds

//     return () => clearInterval(intervalId);
//   }, [jobsProgress]); // Effect depends on jobsProgress

//   const updateJobProgress = (index, updates) => {
//     setJobsProgress(prev => prev.map((job, idx) => idx === index ? {...job, ...updates} : job));
//   };

//   const getTranscodingStatus = async (data, lastStatusUrl) => {
//     let requestData = queryString.stringify(data);
//     let response = await fetch(lastStatusUrl, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded'
//       },
//       body: requestData
//     });
//     let result = await response.json();
//     return result;
//   };

//   return (
//     <div>
//       {jobsProgress.map((job, index) => (
//         <div key={index}>
//           <strong>{job.templateName}: </strong>
//           <span>{job.status} - Progress: {job.percent}%</span>
//           {job.error && <div>Error: {job.errorMessage}</div>}
//         </div>
//       ))}
//     </div>
//   );
// };

// export default TranscodingProgress;






// import React, { useEffect, useState } from 'react';
// import queryString from 'query-string';

// const TranscodingProgress = ({ transcodingJobs }) => {
//   const [jobsProgress, setJobsProgress] = useState([]);

//   useEffect(() => {
//     const fetchTranscodingStatus = async () => {
//       for (let job of transcodingJobs) {
//         try {
//           const data = { task_tokens: job.taskToken };
//           const result = await getTranscodingStatus(data, job.statusUrl);
//           const statusDetails = result.statuses[job.taskToken];
//           const updatedJob = {
//             ...job,
//             status: statusDetails.status,
//             progress: statusDetails.percent,
//             lastStatusUrl: statusDetails.status_url // Keep track of the latest status URL
//           };

//           // Update the progress state with the new job details
//           setJobsProgress(prev => prev.map(j => (j.taskToken === job.taskToken ? updatedJob : j)));
//         } catch (error) {
//           console.error(`Error fetching transcoding status for token ${job.taskToken}:`, error);
//         }
//       }
//     };

//     // Schedule periodic updates every 10 seconds
//     const intervalId = setInterval(fetchTranscodingStatus, 10000);

//     // Initial fetch
//     fetchTranscodingStatus();

//     // Cleanup interval on component unmount
//     return () => clearInterval(intervalId);
//   }, [transcodingJobs]);

//   const getTranscodingStatus = async (data, lastStatusUrl) => {
//     let requestData = queryString.stringify(data);
//     let response = await fetch(lastStatusUrl, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded'
//       },
//       body: requestData
//     });
//     let result = await response.json();
//     return result;
//   };

//   return (
//     <div>
//       {jobsProgress.map((job, index) => (
//         <div key={index}>
//           <strong>{job.templateName}: </strong>
//           <span>{job.status} - Progress: {job.progress}%</span>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default TranscodingProgress;






// import React, { useEffect, useState } from 'react';
// import queryString from 'query-string';

// const TranscodingProgress = ({ transcodingJobs }) => {
//   const [jobsProgress, setJobsProgress] = useState([]);

//   useEffect(() => {
//     const fetchTranscodingStatus = async () => {
//       for (let job of transcodingJobs) {
//         try {
//           const data = { task_tokens: job.taskToken };
//           const result = await getTranscodingStatus(data, job.statusUrl);
//           const statusDetails = result.statuses[job.taskToken];
//           const updatedJob = {
//             ...job,
//             status: statusDetails.status,
//             progress: statusDetails.percent,
//             lastStatusUrl: statusDetails.status_url // Keep track of the latest status URL
//           };

//           // Update the progress state with the new job details
//           setJobsProgress(prev => prev.map(j => (j.taskToken === job.taskToken ? updatedJob : j)));
//         } catch (error) {
//           console.error(`Error fetching transcoding status for token ${job.taskToken}:`, error);
//         }
//       }
//     };

//     // Schedule periodic updates every 10 seconds
//     const intervalId = setInterval(fetchTranscodingStatus, 10000);

//     // Initial fetch
//     fetchTranscodingStatus();

//     // Cleanup interval on component unmount
//     return () => clearInterval(intervalId);
//   }, [transcodingJobs]);

//   const getTranscodingStatus = async (data, lastStatusUrl) => {
//     let requestData = queryString.stringify(data);
//     let response = await fetch(lastStatusUrl, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded'
//       },
//       body: requestData
//     });
//     let result = await response.json();
//     return result;
//   };

//   return (
//     <div>
//       {jobsProgress.map((job, index) => (
//         <div key={index}>
//           <strong>{job.templateName}: </strong>
//           <span>{job.status} - Progress: {job.progress}%</span>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default TranscodingProgress;








// import React, { useEffect, useState, useCallback } from 'react';

// //import { QencodeApiRequest } from '../services/api';

// import queryString from 'query-string'

// const TranscodingProgress = ({ transcodingJobs }) => {
//   const [jobsProgress, setJobsProgress] = useState([]);


//   console.log("transcodingJobs: ", transcodingJobs)

//     const getTranscodingStatus = useCallback(async (data, lastStatusUrl) => {

//         // data is like { task_tokens: taskToken }
//         // lastStatusUrl is string

//         let requestData = queryString.stringify(data)

//         let response = await fetch(`${lastStatusUrl}`, {
//             method: 'POST',
//             headers: {
//             'Content-Type': 'application/x-www-form-urlencoded'
//             },
//             body: requestData
//         })

//         let result = await response.json();

//         return result   
//     },[])  

//     // let result = await getTranscodingStatus( { task_tokens: taskToken }, lastStatusUrl)    

//   return (
//     <div>
//       {jobsProgress.map((job, index) => (
//         <div key={index}>
//           <strong>{job.templateName}: </strong>
//           <span>{job.status} - Progress: {job.progress}%</span>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default TranscodingProgress;
