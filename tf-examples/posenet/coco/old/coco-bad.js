/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licnses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
// import dat from 'dat.gui';
// import * as tf from '@tensorflow/tfjs-core';
// import * as posenet from '../src';
// import {drawKeypoints, drawSkeleton, renderImageToCanvas} from './demo_util';

const images = [
  'frisbee.jpg',
  'frisbee_2.jpg',
  'backpackman.jpg',
  'boy_doughnut.jpg',
  'soccer.png',
  'with_computer.jpg',
  'snowboard.jpg',
  'person_bench.jpg',
  'skiing.jpg',
  'fire_hydrant.jpg',
  'kyte.jpg',
  'looking_at_computer.jpg',
  'tennis.jpg',
  'tennis_standing.jpg',
  'truck.jpg',
  'on_bus.jpg',
  'tie_with_beer.jpg',
  'baseball.jpg',
  'multi_skiing.jpg',
  'riding_elephant.jpg',
  'skate_park_venice.jpg',
  'skate_park.jpg',
  'tennis_in_crowd.jpg',
  'two_on_bench.jpg',
];

function drawResults(canvas, poses,
  minPartConfidence, minPoseConfidence) {
  renderImageToCanvas(image, [513, 513], canvas);
  poses.forEach((pose) => {
    if (pose.score >= minPoseConfidence) {
      drawKeypoints(pose.keypoints,
        minPartConfidence, canvas.getContext('2d'));

      drawSkeleton(pose.keypoints,
        minPartConfidence, canvas.getContext('2d'));
    }
  });
}

const imageBucket = 'https://storage.googleapis.com/tfjs-models/assets/posenet/';

async function loadImage(imagePath) {
  const image = new Image();
  const promise = new Promise((resolve, reject) => {
    image.crossOrigin = '';
    image.onload = () => {
      resolve(image);
    };
  });

  image.src = `${imageBucket}${imagePath}`;
  return promise;
}

function singlePersonCanvas() {
  return document.querySelector('#single canvas');
}

function multiPersonCanvas() {
  return document.querySelector('#multi canvas');
}

function drawSinglePoseResults(pose) {
  const canvas = singlePersonCanvas();
  drawResults(canvas, [pose],
    guiState.singlePoseDetection.minPartConfidence,
    guiState.singlePoseDetection.minPoseConfidence);
}

function drawMultiplePosesResults(poses) {
  const canvas = multiPersonCanvas();
  drawResults(canvas, poses,
    guiState.multiPoseDetection.minPartConfidence,
    guiState.multiPoseDetection.minPoseConfidence);
}

async function decodeSinglePoseAndDrawResults() {
  if (!modelOutputs) {
    return;
  }

  const pose = await posenet.decodeSinglePose(
    modelOutputs.heatmapScores, modelOutputs.offsets,
    guiState.outputStride);

  drawSinglePoseResults(pose);
}

async function decodeMultiplePosesAndDrawResults() {
  if (!modelOutputs) {
    return;
  }

  const poses = await posenet.decodeMultiplePoses(
    modelOutputs.heatmapScores, modelOutputs.offsets,
    modelOutputs.displacementFwd, modelOutputs.displacementBwd,
    guiState.outputStride,
    guiState.multiPoseDetection.maxDetections, guiState.multiPoseDetection);

  drawMultiplePosesResults(poses);
}

async function decodeSingleAndMultiplePoses() {
  decodeSinglePoseAndDrawResults();
  decodeMultiplePosesAndDrawResults();
}

function setStatusText(text) {
  const resultElement = document.getElementById('status');
  resultElement.innerText = text;
}

let image = null;
let modelOutputs = null;

function disposeModelOutputs() {
  if (modelOutputs) {
    modelOutputs.heatmapScores.dispose();
    modelOutputs.offsets.dispose();
    modelOutputs.displacementFwd.dispose();
    modelOutputs.displacementBwd.dispose();
  }
}

async function testImageAndEstimatePoses(net) {
  setStatusText('Predicting...');
  document.getElementById('results').style.display = 'none';

  disposeModelOutputs();
  image = await loadImage(guiState.image);

  const input = tf.fromPixels(image);

  modelOutputs = await net.predictForMultiPose(input, guiState.outputStride);

  await decodeSingleAndMultiplePoses();

  setStatusText('');
  document.getElementById('results').style.display = 'block';
  input.dispose();
}

let guiState;

function setupGui(net) {
  guiState = {
    outputStride: 16,
    image: 'tennis_in_crowd.jpg',
    detectPoseButton: () => {
      testImageAndEstimatePoses(
        net);
    },
    singlePoseDetection: {
      minPartConfidence: 0.5,
      minPoseConfidence: 0.5,
    },
    multiPoseDetection: {
      minPartConfidence: 0.5,
      minPoseConfidence: 0.5,
      scoreThreshold: 0.5,
      nmsRadius: 20.0,
      maxDetections: 15,
    },
  };

  const gui = new dat.GUI();
  gui.add(guiState, 'outputStride', [32, 16, 8])
    .onChange((outputStride) => guiState.outputStride =
        Number(outputStride));
  gui.add(guiState, 'image', images);
  gui.add(guiState, 'detectPoseButton');

  const multiPoseDetection = gui.addFolder('Multi Pose Estimation');
  multiPoseDetection.open();
  multiPoseDetection.add(
    guiState.multiPoseDetection, 'minPartConfidence', 0.0, 1.0)
    .onChange(decodeMultiplePosesAndDrawResults);
  multiPoseDetection.add(
    guiState.multiPoseDetection, 'minPoseConfidence', 0.0, 1.0)
    .onChange(decodeMultiplePosesAndDrawResults);

  multiPoseDetection.add(guiState.multiPoseDetection, 'nmsRadius', 0.0, 40.0)
    .onChange(decodeMultiplePosesAndDrawResults);
  multiPoseDetection.add(guiState.multiPoseDetection, 'maxDetections')
    .min(1)
    .max(20)
    .step(1)
    .onChange(decodeMultiplePosesAndDrawResults);

  const singlePoseDetection = gui.addFolder('Single Pose Estimation');
  singlePoseDetection.add(
    guiState.singlePoseDetection, 'minPartConfidence', 0.0, 1.0)
    .onChange(decodeSinglePoseAndDrawResults);
  singlePoseDetection.add(
    guiState.singlePoseDetection, 'minPoseConfidence', 0.0, 1.0)
    .onChange(decodeSinglePoseAndDrawResults);
  singlePoseDetection.open();
}

async function bindPage() {
  const net = await posenet.load();

  setupGui(net);

  await testImageAndEstimatePoses(net);
  document.getElementById('loading').style.display = 'none';
  document.getElementById('main').style.display = 'block';
}

bindPage();
