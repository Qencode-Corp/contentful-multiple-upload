import { v4 as uuidv4 } from 'uuid';

const RandomizedFileName = ({ url, output, file_extension, image_format, uuid }) => {

    // check if url has {uuid}
    let hasUuidPlaceHolder = url.includes('{uuid}')
    if(hasUuidPlaceHolder){
      return url.replace('{uuid}', uuid);
    }

    uuid = uuidv4();

    let fileExtention = ''

    switch (output) {
      case 'mp4':
        fileExtention = '.mp4'
        break;
      case 'webm':
        fileExtention = '.webm'
        break;
      case 'mp3':
        fileExtention = '.mp3'
        break;        
      case 'repack':
        if(file_extension){
          fileExtention = file_extension
        }        
        break;  
      case 'gif':
        fileExtention = '.gif'
        break;  
      case 'thumbnail':
        if(image_format){
          fileExtention = `.${image_format}`
        }else{
          fileExtention = '.png'
        }        
        break;                               
      default:
        // do nothing
    }

    return `${url}/${uuid}${fileExtention}`;
};

export { RandomizedFileName };
