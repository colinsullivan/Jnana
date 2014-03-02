# Jnana

## Overview

"Jnana" is a generative musical accompaniment system integrated into Ableton Live.  It has the ability to analyze MIDI input and generate new material in a similar style.  It can analyze input in real-time or from desired clips within Ableton and can populate Ableton clips with new material.

For more information on the functionality of Jnana:

[ccrma.stanford.edu/~colinsul/projects/jnana](http://ccrma.stanford.edu/~colinsul/projects/jnana)

## Using

To run Jnana within Ableton Live, you'll need the following software:

* Ableton Live 8.3.x
* Max for Live

To install the plug-ins from the command-line:

```bash
wget https://github.com/colinsullivan/Jnana/archive/v0.1.zip --no-check-certificate
unzip v0.1.zip
cd Jnana/
```

then

```bash
make install-live8
```

or

```bash
make install-live9
```

depending on your version of Ableton.

Once the plug-ins are installed, an Ableton Live track must be configured correctly for the plug-ins to work.

For information on installing and configuring on **OS X**, see the **setup guide**: [ccrma.stanford.edu/~colinsul/projects/jnana/osx-setup-guide/](http://ccrma.stanford.edu/~colinsul/projects/jnana/osx-setup-guide/).

## Developing

To get started with development, check out the class diagrams in `docs/` to get a feel for how things are working together.  Feel free to contact with any questions.

## License

Jnana is licensed under GPLv3.  For more information see `LICENSE`.
