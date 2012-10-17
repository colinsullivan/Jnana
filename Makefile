MAX_JAVSCRIPT_DIR=/Applications/Max5/Cycling\ \'74/jsextensions
MAX_ABLETON_MIDI_EFFECTS_DIR=~/Library/Application\ Support/Ableton/Library/Presets/MIDI\ Effects/Max\ MIDI\ Effect

install:
	cp ./lib/* ${MAX_JAVSCRIPT_DIR}/
	test -d ${MAX_ABLETON_MIDI_EFFECTS_DIR}/CS\ Devices/ || mkdir ${MAX_ABLETON_MIDI_EFFECTS_DIR}/CS\ Devices/
	cp ./ableton/* ${MAX_ABLETON_MIDI_EFFECTS_DIR}/CS\ Devices/
