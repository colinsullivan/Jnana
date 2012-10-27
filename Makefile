MAX_JAVSCRIPT_DIR=/Applications/Max5/Cycling\ \'74/jsextensions
MAX_ABLETON_MIDI_EFFECTS_DIR=~/Library/Application\ Support/Ableton/Library/Presets/MIDI\ Effects/Max\ MIDI\ Effect

all: install

install:
	cp ./lib/*.js ${MAX_JAVSCRIPT_DIR}/
	cp ./lib/vendor/*.js ${MAX_JAVSCRIPT_DIR}
	test -d ${MAX_ABLETON_MIDI_EFFECTS_DIR}/CS\ Devices/ || mkdir ${MAX_ABLETON_MIDI_EFFECTS_DIR}/CS\ Devices/
	cp ./ableton/* ${MAX_ABLETON_MIDI_EFFECTS_DIR}/CS\ Devices/

test:
	mocha ./tests/*.js

