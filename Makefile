MAX_JAVSCRIPT_DIR=/Applications/Max5/Cycling\ \'74/jsextensions
MAX_ABLETON_MIDI_EFFECTS_DIR=~/Library/Application\ Support/Ableton/Library/Presets/MIDI\ Effects/Max\ MIDI\ Effect

all: ./build/CS.js

./build/CS.js: ./lib/*.js
	# Concatenating all javascript files in lib folder in a specific order
	test -d ./build/ || mkdir ./build/
	cp ./lib/CS.js ./build/CS.js
	cat ./lib/CSAbletonClip.js >> ./build/CS.js
	cat ./lib/CSAbletonPhraseRenderingClip.js >> ./build/CS.js
	cat ./lib/CSClipAnalyzer.js >> ./build/CS.js
	cat ./lib/CSHelpers.js >> ./build/CS.js
	cat ./lib/CSInputAnalyzer.js >> ./build/CS.js
	cat ./lib/CSAbletonInputAnalyzer.js >> ./build/CS.js
	cat ./lib/CSMarkovPhraseGenerator.js >> ./build/CS.js
	cat ./lib/CSMarkovStateMachine.js >> ./build/CS.js
	cat ./lib/CSProbabilityVector.js >> ./build/CS.js
	cat ./lib/CSMarkovTable.js >> ./build/CS.js
	cat ./lib/CSMarkovTableRow.js >> ./build/CS.js
	cat ./lib/CSPhrase.js >> ./build/CS.js
	cat ./lib/CSPhraseNote.js >> ./build/CS.js

clean:
	rm ./build/CS.js

install:
	cp ./lib/vendor/*.js ${MAX_JAVSCRIPT_DIR}
	cp ./lib/CSAbletonMarkovAnalysisAndGenerator.js ${MAX_JAVSCRIPT_DIR}/
	cp ./lib/CSLiveInputAnalyzer.js ${MAX_JAVSCRIPT_DIR}/
	cp ./build/CS.js ${MAX_JAVSCRIPT_DIR}/
	test -d ${MAX_ABLETON_MIDI_EFFECTS_DIR}/CS\ Devices/ || mkdir ${MAX_ABLETON_MIDI_EFFECTS_DIR}/CS\ Devices/
	cp ./ableton/* ${MAX_ABLETON_MIDI_EFFECTS_DIR}/CS\ Devices/

test:
	mocha ./tests/*.js

