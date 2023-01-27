function getParam(sParam) {
  var sPageURL = window.location.search.substring(1),
      sURLVariables = sPageURL.split('&'),
      sParameterName,
      i;

  for (i = 0; i < sURLVariables.length; i++) {
      sParameterName = sURLVariables[i].split('=');

      if (sParameterName[0] === sParam) {
          return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
      }
  }
  return false;
};

const channel = getParam('channel');
const fontsize = getParam('size') ? getParam('size') : '18';

var options = {
  connection: {
    reconnect: true,
    secure: true
  },
  channels: [channel]
}
const client = new tmi.Client(options);
client.connect().catch(console.error);

var emoji = new EmojiConvertor();
emoji.allow_native = false;
emoji.replace_mode = 'css';
emoji.use_sheet = true;
emoji.img_sets.twitter.sheet = 'emoji/twitter.png?14.0.0';
emoji.img_sets.google.sheet = 'emoji/google.png?14.0.0';
emoji.img_sets.apple.sheet = 'emoji/apple.png?14.0.0';
emoji.img_sets.facebook.sheet = 'emoji/facebook.png?14.0.0';
emoji.img_set = getParam('emoji') ? getParam('emoji') : 'twitter';

client.on('connecting', (address, port) => {
  console.log('Connecting to ' + channel + ' (' + address + ':' + port + ')')
});
client.on('connected', (address, port) => {
  console.log('Connected to ' + channel + ' (' + address + ':' + port + ')')
  if (!gotGlobalBadges) {
    getGlobalBadges();
  }
});
client.on('disconnected', (reason) => {
  if (reason) {
    console.log('Connection lost: ' + reason)
  } else {
    console.log('Connection lost')
  }
});

var pronouns = {};
var pronounNames = {
  'aeaer': 'Ae/Aer',
  'any': 'Any',
  'eem': 'E/Em',
  'faefaer': 'Fae/Faer',
  'hehim': 'He/Him',
  'heshe': 'He/She',
  'hethey': 'He/They',
  'hethem': 'He/They',
  'itits': 'It/Its',
  'other': 'Other',
  'perper': 'Per/Per',
  'sheher': 'She/Her',
  'shethey': 'She/They',
  'shethem': 'She/They',
  'theythem': 'They/Them',
  'vever': 'Ve/Ver',
  'xexem': 'Xe/Xem',
  'ziehir': 'Zie/Hir'
}

function getPronoun(username) {
  $.get('https://pronouns.alejo.io/api/users/' + username, function(data, status) {
    if (status == 'success') {
      if (data.length == 0) {
        pronouns[username] = null;
        return null;
      } else {
        pronouns[username] = data[0]['pronoun_id'];
        console.log('Pronouns for ' + username + ' retrieved: ' + pronouns[username])
        if (pronounNames.hasOwnProperty(pronouns[username])) {
          $('.nopronoun_' + username).replaceWith('<span class="pronouns">&nbsp;' + pronounNames[pronouns[username]] + '&nbsp;</span>&nbsp;');
        }
        return pronouns[username];
      }
    } else {
      console.log('Could not retrieve pronouns for ' + username)
      return null;
    }
  });
}

var roomID = null;
var badgeList = {'channel': {}, 'global': {}};
var gotBadges = false;
var gotGlobalBadges = false;
var gotBTTV = false;
var gotFFZ = false;
function getBadges() {
  $.get('https://badges.twitch.tv/v1/badges/channels/' + roomID + '/display', function(data, status) {
    if (status == 'success') {
      //badgeList = Object.assign(data['badge_sets'], badgeList);
      badgeList['channel'] = data['badge_sets'];
      console.log('Retrieved channel badges')
      gotBadges = true;
    } else {
      console.log('Could not retrieve channel badges')
    }
  });
}
function getGlobalBadges() {
  $.get('https://badges.twitch.tv/v1/badges/global/display', function(data, status) {
    if (status == 'success') {
      //badgeList = Object.assign(data['badge_sets'], badgeList);
      badgeList['global'] = data['badge_sets'];
      console.log('Retrieved global badges')
      gotGlobalBadges = true;
    } else {
      console.log('Could not retrieve global badges')
    }
  });
}
function getBTTV() {
  gotBTTV = true;
  $.get('https://api.betterttv.net/3/cached/users/twitch/' + roomID, function(data, status) {
    if (status == 'success') {
      if (data.hasOwnProperty['message'] && data['message'] == 'user not found') {
        console.log('No BTTV emotes to retrieve')
      } else {
        for (var emote in data['channelEmotes']) {
          emoteList[ data['channelEmotes'][emote]['code'] ] = 'https://cdn.betterttv.net/emote/' + data['channelEmotes'][emote]['id'] + '/3x';
        }
        for (var emote in data['sharedEmotes']) {
          emoteList[ data['sharedEmotes'][emote]['code'] ] = 'https://cdn.betterttv.net/emote/' + data['sharedEmotes'][emote]['id'] + '/3x';
        }
        console.log('Retrieved BTTV emotes')
      }
      gotBTTV = true;
    } else {
      console.log('Could not retrieve BTTV emotes')
    }
  });
}
function getFFZ() {
  gotFFZ = true;
  $.get('https://api.betterttv.net/3/cached/frankerfacez/users/twitch/' + roomID, function(data, status) {
    if (status == 'success') {
      if (data.length > 0) {
        for (var emote in data) {
          //emoteList[ data[emote]['code'] ] = data[emote]['images']['4x'];
          emoteList[ data[emote]['code'] ] = 'https://cdn.frankerfacez.com/emote/' + data[emote]['id'] + '/2';
        }
        console.log('Retrieved FFZ emotes')
      } else {
        console.log('No FFZ emotes to retrieve')
      }
      gotFFZ = true;
    } else {
      console.log('Could not retrieve FFZ emotes')
    }
  });
}

var messageCount = 0;
var messageLimit = 50;

client.on('message', (channel, tags, message, self) => {
	console.log(tags['display-name'] + ': ' + message);
  console.log(tags);

  sendMessage(tags, message);

  if (!roomID) {
    roomID = tags['room-id'];
  }
  if (!gotBadges) {
    getBadges();
  }
  if (!gotGlobalBadges) {
    getGlobalBadges();
  }
  if (!gotBTTV) {
    getBTTV();
  }
  if (!gotFFZ) {
    getFFZ();
  }
});

function sendMessage(tags, message) {
  if (tags['mod'] && message == '!refresh' || tags['username'] == channel.toLowerCase() && message == '!refresh') {
    location.reload();
  }

  var pronoun = null;
  if (pronouns.hasOwnProperty(tags['username'])) {
    pronoun = pronouns[tags['username']];
  } else {
    pronoun = getPronoun(tags['username']);
  }
  if (pronounNames.hasOwnProperty(pronoun)) {
    pronoun = pronounNames[pronoun];
  }
  var color;
  if (!tags['color']) {
    color = '#999';
  } else {
    color = tags['color'];
  }
  var append = '<div class="message user_' + tags['username'] + '" id="' + tags['id'] + '" style="font-size:' + fontsize + ';">';
  if (tags['badges']) {
    append += parseBadges(tags['badges']);
  }
  if (pronoun) {
    append += '<span class="pronouns">&nbsp;' + pronoun + '&nbsp;</span>&nbsp;'
  } else {
    append += '<span class="nopronoun_' + tags['username'] + '"></span>';
  }
  append += '<span class="name" style="color: ' + color + ';">' + tags['display-name'] + '</span>&nbsp;&nbsp;';
  append += '<span class="content">'
  if (tags['message-type'] == 'action') { append += '<em>'; }
  append += parseMessage(message, tags['emotes'])
  if (tags['message-type'] == 'action') { append += '</em>'; }
  append += '</span>';
  append += '</div>';
  $('.chat').append(append);

  messageCount += 1;
  checkMessageCount();
}

var emoteList = {}
function parseMessage(message, emotes) {
  if (emotes) {
    for (var emote in emotes) {
      emotes[emote].forEach((range) => {
        range = range.split('-').map(index => parseInt(index));
        var name = message.slice(range[0], range[1] + 1);
        emoteList[name] = 'https://static-cdn.jtvnw.net/emoticons/v2/' + emote + '/default/dark/3.0';
      });
    }
  }
  message = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (var emote in emoteList) {
    //message = message.replace(emote, '<img class="emote" src="' + emoteList[emote] + '">');
    var regemote = emote.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)').replace('|', '\\|');
    var regex = new RegExp('\\b\(' + regemote + '\)\\b', 'g');
    if (emote == ':)' || emote == ':(') {
      regex = new RegExp('\\B\(' + regemote + '\)\\B', 'g');
    }
    message = message.replace(regex, '<img class="emote" src="' + emoteList[emote] + '">');
  }
  message = emoji.replace_unified(message.replaceAll('\u{e0002}', '\u200d'));
  return message;
}
function parseBadges(badges) {
  var text = '';
  for (var badge in badges) {
    if (badgeList['channel'].hasOwnProperty(badge)) {
      if (badgeList['channel'][badge]['versions'].hasOwnProperty(badges[badge])) {
        var url = badgeList['channel'][badge]['versions'][badges[badge]]['image_url_4x'];
        text += '<img class="badge" src="' + url + '">&nbsp;'
      }
    } else if (badgeList['global'].hasOwnProperty(badge)) {
      if (badgeList['global'][badge]['versions'].hasOwnProperty(badges[badge])) {
        var url = badgeList['global'][badge]['versions'][badges[badge]]['image_url_4x'];
        text += '<img class="badge" src="' + url + '">&nbsp;'
      }
    }
  }
  return text;
}

client.on('messagedeleted', (channel, username, deletedMessage, tags) => {
  console.log(username + '\'s message deleted');
  $('.chat').children('#' + tags['target-msg-id']).remove();
  messageCount -= 1;
});
client.on('clearchat', (channel) => {
  console.log('Chat cleared');
  $('.chat').children().remove();
  messageCount = 0;
});

client.on('subscription', (channel, username, method, message, tags) => {
  console.log('Sub from ' + username + ': ' + message);
  sendNotif(tags['system-msg']);
  if (message) { sendMessage(tags, message); }
});
client.on('resub', (channel, username, months, message, tags, methods) => {
  console.log('Resub from ' + username);
  sendNotif(tags['system-msg']);
  if (message) { sendMessage(tags, message); }
});
client.on('subgift', (channel, username, streakMonths, recipient, methods, tags) => {
  console.log('Giftsub from ' + username + ' to ' + recipient);
  sendNotif(tags['system-msg']);
});
client.on('giftpaidupgrade', (channel, username, sender, tags) => {
  console.log('Sub continuation from giftsub: ' + username);
  sendNotif(tags['system-msg']);
});
client.on('submysterygift', (channel, username, numbOfSubs, methods, tags) => {
  console.log(numbOfSubs + ' Giftsub(s) from ' + username);
  sendNotif(tags['system-msg']);
});
client.on('cheer', (channel, tags, message) => {
  console.log('Cheered ' + tags['bits'] + ' bit(s) from ' + tags['username']);
  sendNotif(tags['display-name'] + ' cheered ' + tags['bits'] + ' bit' + sIfMoreThanOne(tags['bits']) + '!');
  sendMessage(tags, message);
});

client.on('raided', (channel, username, viewers) => {
  console.log('Raid from' + username);
  sendNotif(username + ' is rading with a party of ' + viewers + '.');
});

client.on('ban', (channel, username, reason, tags) => {
  console.log('Banned: ' + username);
  $('.user_' + username).remove();
});
client.on('timeout', (channel, username, reason, duration, userstate) => {
  console.log('Timeout: ' + username);
  $('.user_' + username).remove();
});

function sendNotif(message) {
  var append = '<div class="notif">';
  append += message;
  append += '</div>'
  $('.chat').append(append);
  messageCount += 1;
  checkMessageCount();
}

function checkMessageCount() {
  if (messageCount > messageLimit) {
    //$('.chat .message').first().remove();
    $('.chat').children().first().remove()
    messageCount -= 1;
  }
}

function sIfMoreThanOne(amount) {
  if (parseInt(amount) == 1) {
    return '';
  } else {
    return 's';
  }
}
