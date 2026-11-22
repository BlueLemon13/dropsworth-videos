import React from 'react';
import {Composition} from 'remotion';
import {Explainer} from './Explainer';
import {FPS, VideoProps, withTimings} from './types';
import sample from '../scripts/sample.json';
import reelSample from '../scripts/v3-why-validate.props.json';
import {Reel, ReelProps} from './Reel';
import {Sauce, SauceProps} from './Sauce';
import {Sheet} from './Sheet';
import {Dodged, DodgedProps, dodgedLength} from './Dodged';
import {Walk, WalkProps, Paper} from './Walk';
import {Guide, GuideProps} from './Guide';

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
      // never longer than the background clip: when the clip ends, the video (and music) ends
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, Math.floor(Math.min(props.duration, props.video && props.videoSeconds ? props.videoSeconds - 0.15 : props.duration) * FPS))})}
    />
    <Composition
      id="Dodged"
      component={Dodged}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={300}
      defaultProps={{src: "", shots: [], cta: [], ctaSeconds: 2.5} as DodgedProps}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, dodgedLength(props))})}
    />
    <Composition
      id="Walk"
      component={Walk}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={300}
      defaultProps={{audio: "", duration: 10, shots: [], chunks: []} as WalkProps}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, Math.round(props.duration * FPS))})}
    />
    <Composition
      id="Guide"
      component={Guide}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={300}
      defaultProps={{audio: "", duration: 10, shots: [], chunks: [], pops: []} as GuideProps}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, Math.round(props.duration * FPS))})}
    />
    <Composition id="PaperStill" component={Paper} width={1080} height={1920} fps={FPS} durationInFrames={1} />
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
