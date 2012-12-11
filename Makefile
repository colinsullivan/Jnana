###
#   @file       Makefile
#
#   @author     Colin Sullivan <colinsul [at] gmail.com>
#
#               Copyright (c) 2012 Colin Sullivan
#               Licensed under the GPLv3 license.
###


###
#		Change these two lines if your setup is different.
###
MAX_JAVSCRIPT_DIR=/Applications/Max5/Cycling\ \'74/jsextensions
MAX_ABLETON_MIDI_EFFECTS_DIR=~/Library/Application\ Support/Ableton/Library/Presets/MIDI\ Effects/Max\ MIDI\ Effect

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
${BUILD_JSEXT}/CS.js: ${CS_LIB_PATHS}
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

install:
	cp ${BUILD_JSEXT}/CS.js ${MAX_JAVSCRIPT_DIR}/
	cp ${BUILD_JSEXT}/CSJnanaLive.js ${MAX_JAVSCRIPT_DIR}/
	cp ${BUILD_JSEXT}/CSJnanaClips.js ${MAX_JAVSCRIPT_DIR}/
	test -d ${MAX_ABLETON_MIDI_EFFECTS_DIR}/CS\ Devices/ || mkdir ${MAX_ABLETON_MIDI_EFFECTS_DIR}/CS\ Devices/
	cp ${BUILD_MAX}/* ${MAX_ABLETON_MIDI_EFFECTS_DIR}/CS\ Devices/

test:
	mocha ./tests/*.js

