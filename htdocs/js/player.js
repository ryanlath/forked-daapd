

var app = new Vue({
  el: '#root',
  data: {
    config: {},
    library: {},
    now_playing: {},
    player_status: {},
    timer_id: 0,
    outputs: [],
    show_outputs_dialog: false,
    show_info_now_playing: false
  },

  created: function () {
    this.loadConfig();
    this.loadLibrary();
    this.loadPlayerStatus();
    this.loadOutputs();
  },

  methods: {
    loadConfig: function() {
      axios.get('/api/config').then(response => {
        this.config = response.data;
        this.connect()});
    },

    loadLibrary: function() {
      axios.get('/api/library').then(response => this.library = response.data);
    },

    loadPlayerStatus: function() {
      axios.get('/api/player').then(response => {
        this.player_status = response.data
        this.loadNowPlaying();
        if (this.player_status.state !== 'play' || this.player_status.item_length_ms == 0) {
          if (this.timer_id != 0) {
            window.clearInterval(this.timer_id);
            this.timer_id = 0;
          }
        } else if (this.timer_id === 0) {
          this.timer_id = window.setInterval(() => {
              this.player_status.item_progress_ms += 1000;
            }, 1000);
        }
      });
    },

    loadNowPlaying: function() {
      if (this.player_status.item_id > 0) {
        if (this.now_playing.id != this.player_status.item_id) {
          axios.get('/api/queue?id=' + this.player_status.item_id).then(response => this.now_playing = response.data.items[0]);
        }
      } else {
        this.now_playing = {};
      }
    },

    loadOutputs: function() {
      axios.get('/api/outputs').then(response => this.outputs = response.data.outputs);
    },

    showOutputsDialog: function() {
      this.show_outputs_dialog = true;
    },

    closeOutputsDialog: function() {
      this.show_outputs_dialog = false;
    },

    showInfoNowPlayingDialog: function() {
      this.show_info_now_playing = true;
    },

    closeInfoNowPlayingDialog: function() {
      this.show_info_now_playing = false;
    },

    play: function() {
      axios.get('/api/player/play').then(console.log('play'));
    },

    pause: function() {
      axios.get('/api/player/pause').then(console.log('pause'));
    },

    next: function() {
      axios.get('/api/player/next').then(console.log('next'));
    },

    previous: function() {
      axios.get('/api/player/previous').then(console.log('previous'));
    },

    shuffle: function() {
      var shuffle = this.player_status.shuffle ? 'false' : 'true';
      axios.get('/api/player/shuffle?state=' + shuffle).then(console.log('shuffle'));
    },

    consume: function() {
      var consume = this.player_status.consume ? 'false' : 'true';
      axios.get('/api/player/consume?state=' + consume).then(console.log('consume'));
    },

    repeat: function() {
      var repeat = this.player_status.repeat == 'off' ? 'all' : this.player_status.repeat == 'all' ? 'single' : 'off';
      axios.get('/api/player/repeat?state=' + repeat).then(console.log('repeat'));
    },

    update: function() {
      this.library.updating = true;
      axios.get('/api/update').then(console.log('Library is updating'));
    },

    selectOutputs: function() {
      var selected_outputs = [];
      for (var i = 0; i < this.outputs.length; i++) {
        if (this.outputs[i].selected) {
          selected_outputs.push(this.outputs[i].id);
        }
      }

      axios.post('/api/select-outputs', { outputs: selected_outputs }).then(response => {
        if (!this.config.websocket_port) {
          this.loadOutputs();
        }
      });
    },

    setVolume: function() {
      axios.get('/api/player/volume?volume=' + this.player_status.volume).then(console.log('volume'));
    },

    setOutputVolume: function(output_id, output_volume) {
      axios.get('/api/player/volume?volume=' + output_volume + '&output_id=' + output_id).then(console.log('output-volume'));
    },


    connect: function() {
      if (this.config.websocket_port <= 0) {
        console.log('Websocket disabled');
        return;
      }
      var socket = new WebSocket('ws://' + document.domain + ':' + this.config.websocket_port, 'notify');
      const vm = this;
      socket.onopen = function() {
          socket.send(JSON.stringify({ notify: ['update', 'player', 'options', 'outputs', 'volume']}));
          socket.onmessage = function(response) {
              console.log(response.data); // upon message
              var data = JSON.parse(response.data);
              if (data.notify.includes('update')) {
                vm.loadLibrary();
              }
              if (data.notify.includes('player') || data.notify.includes('options') || data.notify.includes('volume')) {
                vm.loadPlayerStatus();
              }
              if (data.notify.includes('outputs') || data.notify.includes('volume')) {
                vm.loadOutputs();
              }
          };
      };
    }
  },

  filters: {
    duration: function(ms) {
      // Display seconds as hours:minutes:seconds

      var seconds = ms / 1000;
      var h = Math.floor(seconds / 3600);
      var m = Math.floor(seconds % 3600 / 60);
      var s = Math.floor(seconds % 3600 % 60);

      return ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);
    },

    join: function(array) {
      return array.join(', ');
    }
  }

})
