import React, { useState } from "react";

import errorStyles from "./Error.module.css";

const Error = ({message}) => {

    const [open, setOpen] = useState(false);

    const handleClick = () =>{
        setOpen(!open)
    }

    return (
      <div className={errorStyles.container}>
        <div onClick={handleClick} className={errorStyles.title}>
          {open ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 168.42 94.12">
              <path
                d="M172.82,200.65a9.9,9.9,0,0,0,0,14l74.3,74.3a9.9,9.9,0,0,0,14,0l74.3-74.3a9.9,9.9,0,0,0-14-14L254.12,268l-67.3-67.3A10,10,0,0,0,172.82,200.65Z"
                transform="translate(-169.92 -197.73)"
              ></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 94.12 168.42">
              <path
                d="M210,326.1a9.9,9.9,0,0,0,14,0l74.3-74.3a9.9,9.9,0,0,0,0-14L224,163.5a9.9,9.9,0,0,0-14,14l67.3,67.3L210,312.1A10,10,0,0,0,210,326.1Z"
                transform="translate(-207.08 -160.58)"
              ></path>
            </svg>
          )}
          <div>Error</div>
        </div>
        {open && <div className={errorStyles.message}>{message}</div>}
      </div>
    );
};

export default Error;
