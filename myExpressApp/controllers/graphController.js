// get the name of the app service instance from environment variables
const appServiceName = process.env.WEBSITE_SITE_NAME;

const graphHelper = require('../utils/graphHelper');

exports.getProfilePage = async(req, res, next) => {

    try {
        // get user's access token scoped to Microsoft Graph from session
        // use token to create Graph client
        const graphClient = graphHelper.getAuthenticatedClient(req.session.protectedResources["graphAPI"].accessToken);

        // return user's profile
        const profile = await graphClient
            .api('/me')
            .get();

        res.render('profile', { isAuthenticated: req.session.isAuthenticated, profile: profile, appServiceName: appServiceName });   
    } catch (error) {
        next(error);
    }
}