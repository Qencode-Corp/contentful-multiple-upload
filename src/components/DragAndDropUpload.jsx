import React, { useState } from 'react';
import { Flex, TextInput, Text } from '@contentful/f36-components';
import { AssetIcon } from '@contentful/f36-icons';

import DragAndDropUploadStyles from "./DragAndDropUpload.module.css";

const DragAndDropUpload = ({ onFilesAdded }) => {
  const [highlight, setHighlight] = useState(false);

  const fileInputRef = React.createRef();

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onFilesAddedEvt = (evt) => {
    if (onFilesAdded) {
      const files = evt.target.files;
      const array = fileListToArray(files);
      onFilesAdded(array);
    }
  };

  const onDragOver = (evt) => {
    evt.preventDefault();
    setHighlight(true);
  };

  const onDragLeave = () => {
    setHighlight(false);
  };

  const onDrop = (evt) => {
    evt.preventDefault();
    const files = evt.dataTransfer.files;
    const array = fileListToArray(files);
    onFilesAdded(array);
    setHighlight(false);
  };

  const fileListToArray = (list) => {
    const array = [];
    for (let i = 0; i < list.length; i++) {
      array.push(list.item(i));
    }
    return array;
  };

  return (
    <Flex flexDirection='column' padding='spacingL' alignItems="center" justifyContent="center" gap="spacingS"
        className={`${DragAndDropUploadStyles.container} ${highlight ? DragAndDropUploadStyles.highlight : ''}`}
        // className={`Dropzone ${highlight ? 'Highlight' : ''}`}
        onClick={openFileDialog}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        // style={{ border: '2px dashed #eeeeee', padding: '20px', borderRadius: '5px', cursor: 'pointer' }}
    >
      {/* <img alt="upload" className="Icon" src="baseline-cloud_upload-24px.svg" /> */}
      <AssetIcon variant="primary" size="xlarge"/>
      <Text>Drop files here or click to upload</Text>
      <TextInput
        ref={fileInputRef}
        type="file"
        multiple
        onChange={onFilesAddedEvt}
        style={{ display: 'none' }}
      />
    </Flex>
  );
};

export default DragAndDropUpload;
