#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import os from 'os'
import { createRequire } from 'module'
import { getPrebuildName } from '../lib/prebuild.js'
import cp from 'child_process'

/**
 * Rename a binding file and move to the prebuilds folder, named according to the supplied parameters.
 */

const require = createRequire(import.meta.url)
const version = require("../package").version;

const yargs = require("yargs")
    .usage("pkg-prebuilds " + version + "\n\nUsage: $0 [<command>] [options]")
    .version(version)
    .options({
        baseDir: {
            demand: true,
            describe: "base path to built binary files",
            type: 'string'
        },
        source: {
            demand: true,
            describe: "filename of built binary file",
            type: "string"
        },
        name: {
            demand: true,
            describe: 'name of the module',
            type: 'string'
        },
        strip: {
            demand: false,
            describe: 'strip file of debug symbols',
            type: 'boolean'
        },
        libc: {
            demand: false,
            describe: 'libc environment',
            type: 'string'
        },
        napi_version: {
            demand: true,
            describe: 'node-api version',
            type: 'string'
        },
        runtime: {
            demand: false,
            describe: 'runtime',
            type: 'string'
        },
        arch: {
            demand: false,
            describe: 'override the architecture',
            type: 'string'
        },
        platform: {
            demand: false,
            describe: 'override the platform',
            type: 'string'
        },
        extraFiles: {
            demand: false,
            describe: 'extra files to copy',
            type: 'string'
        }
    })

const argv = yargs.argv;

const targetDir = path.join(argv.baseDir, 'prebuilds')
const sourceFile = path.join(argv.baseDir, argv.source)

if (!fs.existsSync(sourceFile)) {
    console.error(`Built binary does not exist!`)
    process.exit(1)
}

let libc = argv.libc
if (libc === 'glibc') libc = null

// Determine the target filename
const prebuildName = getPrebuildName({
    arch: argv.arch || os.arch(),
    platform: argv.platform || os.platform(),
    name: argv.name,
    libc: libc,
    napi_version: argv.napi_version,
    runtime: argv.runtime || 'node'
})

const destFile = path.join(targetDir, prebuildName)
const destDir = path.dirname(destFile)

// Make sure the directory exists
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
}

// Copy the bindings file
fs.copyFileSync(sourceFile, destFile)

if (argv.strip) {
    if (os.platform() === 'linux') {
        cp.spawnSync('strip', [destFile, '--strip-all'])
    } else if (os.platform() === 'darwin') {
        cp.spawnSync('strip', [destFile, '-Sx'])
    }
}

// copy any extra files that have been requested, typically libraries needed
if (argv.extraFiles) {
    const extraFiles = Array.isArray(argv.extraFiles) ? argv.extraFiles : [argv.extraFiles]
    
    for (const file of extraFiles) {
        fs.copyFileSync(path.join(argv.baseDir, file), path.join(destDir, file))
    }
}


console.log('Done')
