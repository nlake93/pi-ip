#!/usr/bin/env node
'use strict';

/**
 * Called by setup.sh to generate the device identity (if not already present)
 * and print the Avahi service XML to stdout.
 *
 * setup.sh pipes this output to sudo tee /etc/avahi/services/pi-ip.service,
 * then chowns the file to NODE_USER so the running service can update it later.
 *
 * Usage: node scripts/setup-mdns.js
 */

require('dotenv').config();

const identity = require('../src/identity');
const mdns     = require('../src/mdns');

const id = identity.ensure();
process.stdout.write(mdns.buildXML(id));
