import queryString from 'query-string';

const apiUrl = "https://api.qencode.com/v1/"; //'https://qa-sfo2-api-do.qencode.com/v1/' // https://api-qa.qencode.com/v1/ 

const QencodeApiRequest = async (method, data) => {
  let requestData = queryString.stringify(data);

  let response = await fetch(`${apiUrl}${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: requestData,
  });

  let result = await response.json();
  return result;
};

export { QencodeApiRequest };
