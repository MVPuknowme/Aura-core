// SkyGrid Express integration
// Paste this after `const app = express();` and before `app.listen(...)`.

const { registerSkyGridHealthEndpoint } = require("./skygrid/reliability/skygrid-health");

registerSkyGridHealthEndpoint(app);
