import React from 'react';
import {Composition} from 'remotion';
import {Explainer} from './Explainer';
import {FPS, VideoProps, withTimings} from './types';
import sample from '../scripts/sample.json';
import reelSample from '../scripts/v3-why-validate.props.json';
import {Reel, ReelProps} from './Reel';
import {Sauce, SauceProps} from './Sauce';
import {Sheet} from './Sheet';

const sauceDefault: SauceProps = {image: '', text: 'preview', duration: 12};

export const Root: React.FC = () => (
  <>
    <Composition
      id="Reel"
      component={Reel}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={300}
      defaultProps={reelSample as unknown as ReelProps}
      calculateMetadata={({props}) => ({durationInFrames: Math.ceil(props.duration * FPS)})}
    />
    <Composition
      id="Sauce"
      component={Sauce}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={360}
      defaultProps={sauceDefault}
      calculateMetadata={({props}) => ({durationInFrames: Math.ceil(props.duration * FPS)})}
    />
    <Composition id="Sheet" component={Sheet} width={1080} height={1920} fps={FPS} durationInFrames={1} defaultProps={{files: [] as string[]}} />
    <Composition
      id="Explainer"
      component={Explainer}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={300}
      defaultProps={sample as VideoProps}
      calculateMetadata={({props}) => {
        const timed = withTimings(props.scenes);
        const end = timed[timed.length - 1].end as number;
        return {durationInFrames: Math.ceil((end + 0.8) * FPS)};
      }}
    />
  </>
);
