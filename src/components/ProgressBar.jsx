import React from 'react';
import styles from "./ProgressBar.module.css";

const ProgressBar = ({ progress }) => {
  return (
    <div className={styles.progressBarContainer}>
      <div className={styles.progressBarFill} style={{ width: `${progress}%` }}>
        {/* <span className={styles.progressBarText}>{`${progress}%`}</span> */}
      </div>
    </div>
  );
};

export default ProgressBar;