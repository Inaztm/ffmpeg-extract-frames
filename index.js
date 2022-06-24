'use strict'

const ffmpeg = require('fluent-ffmpeg')
const path = require('path')
const probe = require('ffmpeg-probe')

const noop = () => { }

const timestampsMode = ({ opts, cmd, outputPath }) => {
  const { output, timestamps, offsets, size } = opts

  const folder = outputPath.dir
  const filename = outputPath.base
  const screenshotsParams = {
    folder,
    filename,
    timestamps: timestamps || offsets.map((offset) => offset / 1000)
  }
  if (size) {
    screenshotsParams.size = `${size.x}x${size.y}`
  }

  return new Promise((resolve, reject) => {
    cmd
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .screenshots(screenshotsParams)
  })
}

const defaultMode = ({ opts, cmd, outputPath }) => {
  const { input, output, fps, numFrames } = opts
  
  if (fps) {
    cmd.outputOptions([
      '-r', Math.max(1, fps | 0)
    ])
  } else if (numFrames) {
    const info = await probe(input)
    const numFramesTotal = parseInt(info.streams[0].nb_frames)
    const nthFrame = (numFramesTotal / numFrames) | 0

    cmd.outputOptions([
      '-vsync', 'vfr',
      '-vf', `select=not(mod(n\\,${nthFrame}))`
    ])
  }

  if (outputPath.ext === '.raw') {
    cmd.outputOptions([
      '-pix_fmt', 'rgba'
    ])
  }

  return new Promise((resolve, reject) => {
    cmd
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .output(output)
      .run()
  })
}

/**
 * 
 * @param {Object} opts.log optional
 * @param {Object} opts.input required
 * @param {Object} opts.output required
 * @param {Object} opts.timestamps optional
 * @param {Object} opts.offsets optional
 * @param {Object} opts.fps optional
 * @param {Object} opts.numFrames optional
 * @param {Object} opts.size optional
 * @param {Object} opts.ffmpegPath optional
 * @returns Promise
 */
module.exports = async (opts) => {
  const {
    log = noop,
    input,
    output,
    timestamps,
    offsets,
    ffmpegPath
  } = opts

  if (!input) throw new Error('missing required input')
  if (!output) throw new Error('missing required output')

  const outputPath = path.parse(output)

  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath)
  }

  const cmd = ffmpeg(input)
    .on('start', (cmd) => log({ cmd }))

  if (timestamps || offsets) {
    return timestampsMode({ opts, cmd, outputPath })
  } else {
    return defaultMode({ opts, cmd, outputPath })
  }
}
