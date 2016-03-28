var ac;
stop = false;
function note2freq(note) {
  return Math.pow(2, (note - 69) / 12) * 440;
}

//comes from the UI
var track = {
  tempo: 80,
  tracks: {
    Kick: [ 1, 0, 0, 0, 1, 0, 0, 0,
            1, 0, 0, 0, 1, 0, 0, 0,
            1, 0, 0, 0, 1, 0, 0, 0,
            1, 0, 0, 0, 1, 0, 0, 0],
    Hat: [ 0, 0, 1, 0, 0, 0, 1, 0,
            0, 0, 1, 0, 0, 0, 1, 1,
            0, 0, 1, 0, 0, 0, 1, 0,
            0, 0, 1, 0, 0, 0, 1, 0 ],
    Snare: [ 0, 0, 0, 0, 1, 0, 0, 0,
             0, 0, 0, 0, 1, 0, 0, 0,
             0, 0, 0, 0, 1, 0, 0, 0,
             0, 0, 0, 0, 1, 0, 0, 0 ],
    Bass: [36, 0,38,36,36,38,41, 0,
           36,60,36, 0,39, 0,96, 0,
           36, 0,24,60,40,40,24,24,
           36,60,36, 0,39, 0,48, 0 ],
    Lead: [96, 0, 96, 0, 96, 0, 96, 0,
           86, 0, 86, 0, 86, 0, 86, 0,
           96, 0, 96, 0, 96, 0, 96, 0,
           96, 0, 96, 0, 96, 96, 96, 96]
  }
};

class Sequencer{
  constructor(ac, track){
    this.ac = ac;
    this.track = track;
  }

  clock(){
    var beatLen = 60 / this.track.tempo;
    return (this.ac.currentTime - this.startTime) / beatLen;  
  }

  start(){
    this.startTime = this.ac.currentTime;
    this.nextScheduling = 0;
    this.scheduler();  
  }

  scheduler(){
    var beatLen = 60 / this.track.tempo;
    var lookahead = 0.5;
    if (stop) {
      return;
    }

    if (this.clock() + lookahead > this.nextScheduling) {
      var steps = [];
      steps.push(this.nextScheduling + beatLen / 4);

      for (var i in this.track.tracks) {
        for (var j = 0; j < steps.length; j++) {
          var idx = Math.round(steps[j] / ((beatLen / 4)));
          var note =
    this.track.tracks[i][idx % this.track.tracks[i].length];
          var octave = 1;
          if (note != 0) {
            this[i](steps[j], note * octave);
          }
        }
      }

      this.nextScheduling += (60 / this.track.tempo / 4);
    }
    setTimeout(this.scheduler.bind(this), 15);
  }

  Kick(t){
    var kick = new Kick(this.ac);
    kick.trigger(t);
  }

  Hat(t){
    var hat = new Hat(this.ac);
    hat.trigger(t);
  }

  Snare(t){
    var snare = new Snare(this.ac);
    snare.trigger(t);
  }

  Bass(t, note){
    var bass = new Bass(this.ac, 'sawtooth');
    bass.trigger(t, note)
  }

  Lead(t, note){
    var lead = new Lead(this.ac, 'sine');
    lead.trigger(t, note);
  }
}

class Kick {
  constructor(context){
    this.context = context;

    this.oscillator = this.context.createOscillator();
    this.oscillatorEnvelope = this.context.createGain();
    this.oscillator.connect(this.oscillatorEnvelope);
    this.oscillatorEnvelope.connect(this.context.destination);
  }

  trigger(time){
    this.oscillator.frequency.setValueAtTime(120, time);
    this.oscillatorEnvelope.gain.setValueAtTime(1, time);

    this.oscillator.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    this.oscillatorEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    this.oscillator.start(time);
    this.oscillator.stop(time + 1);  
  }
}

class Snare {
  constructor(context){
    this.context = context;

    this.noise = this.context.createBufferSource();
    this.noise.buffer = this.noiseBuffer();

    var filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    this.noise.connect(filter);

    this.noiseEnvelope = this.context.createGain();
    filter.connect(this.noiseEnvelope);

    this.noiseEnvelope.connect(this.context.destination);

    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'sawtooth';

    this.oscillatorEnvelope = this.context.createGain();
    this.oscillator.connect(this.oscillatorEnvelope);

    this.oscillatorEnvelope.connect(this.context.destination);
  }

  noiseBuffer(){
    var bufferSize = this.context.sampleRate;
    var buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    var output = buffer.getChannelData(0);

    for(var i = 0; i < bufferSize; i++){
      output[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  trigger(time){
    this.noiseEnvelope.gain.setValueAtTime(1, time);
    this.noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    this.noise.start(time);

    this.oscillator.frequency.setValueAtTime(100, time);
    this.oscillatorEnvelope.gain.setValueAtTime(0.7, time);
    this.oscillatorEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    this.oscillator.start(time);

    this.oscillator.stop(time + 0.2);
    this.noise.stop(time + 0.2);  
  }
}

class Hat {
  constructor(context){
    this.context = context;

    this.noise = this.context.createBufferSource();
    this.noise.buffer = this.noiseBuffer();

    var filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;
    this.noise.connect(filter);

    this.noiseEnvelope = this.context.createGain();
    filter.connect(this.noiseEnvelope);

    this.noiseEnvelope.connect(this.context.destination);
  }

  noiseBuffer(){
    var bufferSize = this.context.sampleRate;
    var buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    var output = buffer.getChannelData(0);

    for(var i = 0; i < bufferSize; i++){
      output[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  trigger(time){
    this.noiseEnvelope.gain.setValueAtTime(1, time);
    this.noiseEnvelope.gain.setTargetAtTime(0, time, 0.02);
    
    this.noise.start(time); 
    this.noise.stop(time + 0.2);
  }
}

class Bass {
  constructor(context, type){
    this.context = context;

    this.oscillator1 = this.context.createOscillator();
    this.oscillator2 = this.context.createOscillator();
    this.oscillator1.type = this.oscillator2.type = type;

    var filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    this.oscillator1.connect(filter);
    this.oscillator2.connect(filter);
    this.oscillator2.detune.value = 20;

    this.oscillatorEnvelope = this.context.createGain();
    this.oscillator1.connect(this.oscillatorEnvelope);

    this.oscillatorEnvelope.connect(this.context.destination);
  }

  trigger(time, note){
    this.oscillator1.frequency.setValueAtTime(note2freq(note), time);
    this.oscillator2.frequency.setValueAtTime(note2freq(note), time)

    this.oscillatorEnvelope.gain.setValueAtTime(0.3, time);
    this.oscillatorEnvelope.gain.setTargetAtTime(0.0, time, 0.1);

    this.oscillator1.start(time);
    this.oscillator2.start(time);
    this.oscillator1.stop(time + 1);
    this.oscillator2.stop(time + 1);
  }
}

class Lead {
  constructor(context, type){
    this.context = context;

    this.oscillator = this.context.createOscillator();
    this.oscillator.type = type;

    var filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 200;
    this.oscillator.connect(filter);

    this.oscillatorEnvelope = this.context.createGain();
    this.oscillator.connect(this.oscillatorEnvelope);

    this.oscillatorEnvelope.connect(this.context.destination);    
  }

  trigger(time, note){
    this.oscillator.frequency.setValueAtTime(note2freq(note), time);

    this.oscillatorEnvelope.gain.setValueAtTime(0.2, time);
    this.oscillatorEnvelope.gain.setTargetAtTime(0.0, time + 0.2, 0.5);

    this.oscillator.start(time);
    this.oscillator.stop(time + 0.2);
  }
}

window.onload = function() {
  ac = new AudioContext();
  //gets track from react page
  var s = new Sequencer(ac, track);
  s.start(); 
}
