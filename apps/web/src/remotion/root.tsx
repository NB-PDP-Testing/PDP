import { Composition } from "remotion";
import { PDPCommercial } from "./compositions/PDPCommercial";
import {
  COMP_NAME,
  DURATION_IN_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "./constants";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      component={PDPCommercial}
      durationInFrames={DURATION_IN_FRAMES}
      fps={VIDEO_FPS}
      height={VIDEO_HEIGHT}
      id={COMP_NAME}
      width={VIDEO_WIDTH}
    />
  </>
);
