# Build

Run `npm run build` to build the app and serve the app from `build` folder.

# Installation 

In your Contentful space go to **Apps** -> **Custom apps** https://app.contentful.com/spaces/[Space_ID]/apps/list/custom 
and click **Manage app definitions** https://app.contentful.com/account/organizations/[Organization_ID]/apps 
where you click **Create app** button

In the form provide **Name**, for example *mult-upload*. For **Frontend** field put url to where your app is served, 
for example *https://contentful.example.com*

For Locations select checkboxes for: 
*App configuration screen*
*Entry Field* -> *JSON object*
*Entry sidebar*
*Page* and check *Show app in main navigation* and provide link name, for example *mult-upload*

Click **Save** button to save app definition

Go back to apps list https://app.contentful.com/account/organizations/[Organization_ID]/apps Find created app in the list, click three dots menu and select **Install to space** If all is fine you will see installed app configuration screen.

Enter valid Qencode API into *API Key* field and click **Validate** button. Your Qencode Transcoding templates will be loaded. Choose one or multiple templates you want to use for transcoding.

Click *CMA Token (Optional)* checkbox to display a field to enter your Contentful CMA Token which is needed for the app. You can create CMA token by clicking *Settings* in top right corner of Contentful UI and select *CMA Tokens*

Click **Install to selected enviroments** or **Save** button. 

The main page for multiple upload will be available in dropdown when clicking *Apps* in Contentful navigation with same name that you put when enabling *Page* location, for example *mult-upload*

During installation app will create Content Types that you can rename if needed. Main Content Type is called 'Video' with ID *qencodeTranscodedAsset*. You need to set up apearence for that Content Type. Find 'Video' in the list of Content Types in Content Model https://app.contentful.com/spaces/[Space_ID]/environments/master/content_types See details here https://docs.qencode.com/tutorials/integrations/contentful-app/#5-content-model In fields list find *Transcoding Data*, click *Edit*, scroll down to *Appearence* and select installed app, *mult-upload* for example and click **Confirm** button. In the same Content Model click *Sidebar*, fined installed app, 'mult-upload' for example, and click plus icon and click **Save** button. You can add different fields to this Content Moled if needed.

During app installation, there is also *Subtitles Item* Content Model created for optional Subtitle items.

App also creates **Qencode Fields** Content Model which works as a tracker indicating what fields you what to be displayed in this app Multiple Upload screen. For example if you add *Description* field to *Video* Content Model and want this field to be displayed on the page for multiple upload you should add text type Field called *Description* in **Qencode Fields**. These fields type are supported: *Short text*, *Boolean*, *Integer*, *Decimal number*, *Date & time*... If you add *Integer* field to *Video* content model and what this field to be displayed, you just add field with same name (field id) to **Qencode Fields** but it must be *Short text* type. Fields to be displayed should match by name (field id).

So you can specified fields to be displayed and enter some values for those fields... When you drop files to file upload area values from updated fiels will be applied to all entries... After file is dropped this process starts: file gets uploaded to Contentful, asset gets crated, processed and published, media entry gets created and published based on that asset, and finally entry of *Video* content type gets created and published and transcoding job is started via Qencode API. The process runs independently for all files dropped into the area for file upload.