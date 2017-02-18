###
#   @file       Makefile
#
#   @author     Colin Sullivan <colinsul [at] gmail.com>
#
#               Copyright (c) 2013 Colin Sullivan
#               Licensed under the GPLv3 license.
###


###
#		These are the defaults on my OS X.  They are probably yours too.
###
MAX7_JAVASCRIPT_DIR=~/Documents/Max\ 7/Library
MAX6_JAVASCRIPT_DIR=/Applications/Max\ 6.1/Cycling\ \'74/jsextensions
MAX5_JAVASCRIPT_DIR=/Applications/Max5/Cycling\ \'74/jsextensions
MAX_JAVASCRIPT_DIR=${MAX7_JAVASCRIPT_DIR}
ABLETON8_MAX_MIDI_EFFECT_DIR=~/Library/Application\ Support/Ableton/Library/Presets/MIDI\ Effects/Max\ MIDI\ Effect
ABLETON9_MAX_MIDI_EFFECT_DIR=~/Music/Ableton/User\ Library/Presets/Midi\ Effects/Max\ Midi\ Effect

###
#		You probably don't need to change anything below.
###

SRC_DIR=./src
BUILD_DIR=./build
BUILD_JSEXT=${BUILD_DIR}/jsextensions
BUILD_MAX=${BUILD_DIR}/Max-MIDI-Effect

CS_LIB=vendor/underscore.js \
	CSHelpers.js \
	CSPhraseNote.js \
	CSPhrase.js \
	CSAbletonClip.js \
	CSProbabilityVector.js \
	CSMarkovTableRow.js \
	CSMarkovTable.js \
	CSMarkovStateMachine.js \
	CSMarkovMultiStateMachine.js \
	CSPhraseAnalyzer.js \
	CSMarkovPhraseGenerator.js \
	CSAbletonPhraseRenderingClip.js \
	CSInputAnalyzer.js \
	CSAbletonInputAnalyzer.js

CS_LIB_PATHS=$(addprefix ${SRC_DIR}/,${CS_LIB})

all: ${BUILD_JSEXT}/CS.js ${BUILD_JSEXT}/CSJnanaLive.js ${BUILD_JSEXT}/CSJnanaClips.js ${BUILD_MAX}/CSJnanaLive.amxd ${BUILD_MAX}/CSJnanaClips.amxd

###
#		Concatenates javascript files in the above list ./build/CS.js in the same
#		order.
###
${BUILD_JSEXT}/CS.js: ${SRC_DIR}/CS.js ${CS_LIB_PATHS}
	cp ${SRC_DIR}/CS.js ${BUILD_JSEXT}/CS.js
	for csdep in ${CS_LIB_PATHS}; do \
		cat $$csdep >> $@; \
	done

###
#		Copy the files that are referenced directly by the max patches of the same
#		name.
###
${BUILD_JSEXT}/CSJnanaLive.js: ${SRC_DIR}/CSJnanaLive.js
	cp $< $@

${BUILD_JSEXT}/CSJnanaClips.js: ${SRC_DIR}/CSJnanaClips.js
	cp $< $@

###
#		Copies the Max/MSP patches themselves into the build directory.
###
${BUILD_MAX}/CSJnanaLive.amxd: ${SRC_DIR}/CSJnanaLive.amxd
	cp $< $@

${BUILD_MAX}/CSJnanaClips.amxd: ${SRC_DIR}/CSJnanaClips.amxd
	cp $< $@

clean:
	rm ${BUILD_JSEXT}/*
	rm ${BUILD_MAX}/*

install-live8:
	cp ${BUILD_JSEXT}/CS.js ${MAX_JAVASCRIPT_DIR}/
	cp ${BUILD_JSEXT}/CSJnanaLive.js ${MAX_JAVASCRIPT_DIR}/
	cp ${BUILD_JSEXT}/CSJnanaClips.js ${MAX_JAVASCRIPT_DIR}/
	test -d ${ABLETON8_MAX_MIDI_EFFECT_DIR}/CS\ Devices/ || mkdir ${ABLETON8_MAX_MIDI_EFFECT_DIR}/CS\ Devices/
	cp ${BUILD_MAX}/* ${ABLETON8_MAX_MIDI_EFFECT_DIR}/CS\ Devices/

install-live9:
	cp ${BUILD_JSEXT}/CS.js ${MAX_JAVASCRIPT_DIR}/
	cp ${BUILD_JSEXT}/CSJnanaLive.js ${MAX_JAVASCRIPT_DIR}/
	cp ${BUILD_JSEXT}/CSJnanaClips.js ${MAX_JAVASCRIPT_DIR}/
	test -d ${ABLETON9_MAX_MIDI_EFFECT_DIR}/CS\ Devices/ || mkdir ${ABLETON9_MAX_MIDI_EFFECT_DIR}/CS\ Devices/
	cp ${BUILD_MAX}/* ${ABLETON9_MAX_MIDI_EFFECT_DIR}/CS\ Devices/

test:
	mocha ./tests/*.js

