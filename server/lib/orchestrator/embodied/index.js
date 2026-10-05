const constants = require("./constants");
const characterState = require("./characterState");
const worldGraph = require("./worldGraph");
const navigation = require("./navigation");
const actions = require("./actions");
const eventBus = require("./eventBus");
const privacy = require("./privacy");
const gaze = require("./gaze");
const expression = require("./expression");
const lipSync = require("./lipSync");
const cameraDirector = require("./cameraDirector");
const variation = require("./variation");
const interruption = require("./interruption");
const microBehaviors = require("./microBehaviors");
const behaviorPlanner = require("./behaviorPlanner");
const behaviorDirector = require("./behaviorDirector");
const avatarProvider = require("./avatarProvider");
const videoSession = require("./videoSession");
const runtime = require("./runtime");
const validator = require("./validator");
const capabilityRegistry = require("./capabilityRegistry");
const visemeEngine = require("./visemeEngine");
const facialAnimationEngine = require("./facialAnimationEngine");
const bodyAnimation = require("./bodyAnimation");
const worldState = require("./worldState");
const quality = require("./quality");
const fallback = require("./fallback");
const credentialDiscovery = require("./credentialDiscovery");
const telemetry = require("./telemetry");
const activation = require("./activation");
const livePipeline = require("./livePipeline");
const productionMatrix = require("./productionMatrix");

module.exports = {
  ...constants,
  ...characterState,
  ...worldGraph,
  ...navigation,
  ...actions,
  eventBus,
  privacy,
  gaze,
  expression,
  lipSync,
  cameraDirector,
  variation,
  interruption,
  microBehaviors,
  behaviorPlanner,
  behaviorDirector,
  avatarProvider,
  videoSession,
  runtime,
  validator,
  capabilityRegistry,
  visemeEngine,
  facialAnimationEngine,
  bodyAnimation,
  worldState,
  quality,
  fallback,
  credentialDiscovery,
  telemetry,
  activation,
  livePipeline,
  productionMatrix,
};
