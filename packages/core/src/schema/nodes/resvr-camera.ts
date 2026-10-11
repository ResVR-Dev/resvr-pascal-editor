import dedent from 'dedent'
import { z } from 'zod'
import { BaseNode, nodeType, objectId } from '../base'

// resvr fork. A camera a buyer is shown in the ResVR showhome, authored in the host's camera mode
// and imported into Unreal as an ABridgeCameraActor. Nothing in Pascal reads it: the host
// registers the node definition that draws it. Named for the fork, so a camera node arriving
// upstream is a real conflict rather than a silent change of meaning.
//
// The rig is Unreal's spring arm, in this scene's metres and axes. The boom points from the
// camera body to the pivot, along d = (cos pitch * cos yaw, sin pitch, cos pitch * sin yaw), and
// the body sits at pivot - d * armLength. Those two angles are Unreal's own boom yaw and pitch,
// because Unreal's axes are this scene's with y and z swapped. position and rotation are the body
// worked out from the rig, written so a reader needs no maths; the rig is what is true.

const Triple = z.tuple([z.number(), z.number(), z.number()])

export const ResvrCameraType = z.enum(['product', 'dollhouse', 'exterior'])

// One thing the camera looks at. The node id is the item; the catalog id is kept so the camera can
// find the same product again after the floor it stands on is read off its sheet afresh.
export const ResvrCameraTarget = z.object({
  nodeId: z.string(),
  catalogId: z.string().nullable(),
  // The item went and nothing like it was found in its place. Kept rather than dropped, so the
  // camera says what it lost.
  isMissing: z.boolean().default(false),
})

// FBridgeCameraParameters, field for field. Distances in metres, angles in radians, the panning
// box in this scene's axes. Defaults are what a new camera gets in Unreal: the struct's own,
// overridden by CameraComponentDefaults in the project's DefaultGame.ini.
export const ResvrCameraParameters = z.object({
  shouldFocusZoomToHit: z.boolean().default(true),
  focusDistanceMultiplier: z.number().default(0.5),
  focusTraceDistance: z.number().default(100000),
  fallbackFocusDistance: z.number().default(100),
  minimumPivotDistance: z.number().default(0.05),
  // Linear RGBA.
  cameraColor: z.tuple([z.number(), z.number(), z.number(), z.number()]).default([0.016, 1, 0.33, 1]),
  cameraVisualScale: z.number().default(0.25),
  shouldClampPanning: z.boolean().default(true),
  minPanning: Triple.default([0, 0, 0]),
  maxPanning: Triple.default([0, 0, 0]),
  // Relative to the authored orbit: how far a buyer may pitch and yaw away from it.
  minRotation: z.object({ pitch: z.number(), yaw: z.number() }).default({
    pitch: (-20 * Math.PI) / 180,
    yaw: (-20 * Math.PI) / 180,
  }),
  maxRotation: z.object({ pitch: z.number(), yaw: z.number() }).default({
    pitch: (10 * Math.PI) / 180,
    yaw: (20 * Math.PI) / 180,
  }),
  isCameraInputEnabled: z.boolean().default(true),
  isPanningInputEnabled: z.boolean().default(true),
  isRotationInputEnabled: z.boolean().default(true),
  isZoomInputEnabled: z.boolean().default(true),
  panSpeed: z.number().default(0.1),
  rotationSpeed: z.number().default(0.5),
  zoomSpeed: z.number().default(0.5),
  zoomInterpSpeed: z.number().default(7.5),
  minZoom: z.number().default(0.5),
  maxZoom: z.number().default(1.5),
})

export const ResvrCameraNode = BaseNode.extend({
  id: objectId('resvr-camera'),
  type: nodeType('resvr-camera'),
  cameraType: ResvrCameraType.default('product'),
  pivot: Triple.default([0, 0, 0]),
  boomYaw: z.number().default((-50 * Math.PI) / 180),
  boomPitch: z.number().default((-35 * Math.PI) / 180),
  armLength: z.number().positive().default(0.9),
  position: Triple.default([0, 0, 0]),
  // Euler YXZ, radians: the body turned so its view, local -Z, runs along the boom.
  rotation: Triple.default([0, 0, 0]),
  // Horizontal, the way Unreal states it. A renderer with a vertical one converts by aspect.
  horizontalFovDegrees: z.number().gt(0).lt(180).default(90),
  targets: z.array(ResvrCameraTarget).default([]),
  // Dashboard category ids. Empty until the editor knows the dashboard's categories.
  categories: z.array(z.string()).default([]),
  parameters: ResvrCameraParameters.default(() => ResvrCameraParameters.parse({})),
  // bClampYaw and CameraPriority, which sit beside the parameters in Unreal.
  shouldClampYaw: z.boolean().default(true),
  priority: z.number().int().default(0),
  // A person renamed it, so a change of targets leaves the name alone.
  isNamedByHand: z.boolean().default(false),
  // Goes up by one on every committed change of the shot, so a picture knows what it shows.
  poseRevision: z.number().int().nonnegative().default(0),
  picture: z
    .object({ url: z.string(), poseRevision: z.number().int().nonnegative() })
    .nullable()
    .default(null),
}).describe(
  dedent`
  ResVR camera - a buyer's camera, Unreal's spring-arm rig in metres
  - object: "resvr-camera"
  - cameraType: product, dollhouse or exterior
  - pivot, boomYaw, boomPitch, armLength: the rig; the body sits at pivot - d * armLength
  - position, rotation: the body, derived from the rig
  - horizontalFovDegrees: the horizontal field of view
  - targets: the items it looks at, by node id and catalog id
  `,
)

export type ResvrCameraNode = z.infer<typeof ResvrCameraNode>
export type ResvrCameraType = z.infer<typeof ResvrCameraType>
export type ResvrCameraTarget = z.infer<typeof ResvrCameraTarget>
export type ResvrCameraParameters = z.infer<typeof ResvrCameraParameters>
