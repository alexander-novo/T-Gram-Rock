$(document).ready(function() {
  $("#form").submit(onFormSubmit);
  setupTable();
  $("#video").hover(function(e) {
    $( this ).attr("controls", "");
  }, function(e) {
    $( this ).removeAttr("controls");
  });
});

function setupTable() {
  var tableHTML = "<tr>";
  tableHTML += "<td class=\"rowHeader\"></td>";
  for(var member in values.members) {
    tableHTML += "<td class=\"rowHeader\">" + member + "</td>";
  }
  tableHTML += "</tr>";

  for(var category of values.categories) {
    tableHTML += "<tr>";
    tableHTML += "<td class=\"rowHeader\">" + category + "</td>";
    for(var member in values.members) {
      tableHTML += "<td>";
      if("videos" in values.members[member] && category in values.members[member].videos) {
        tableHTML += "<a href=\"#!\"><img src=\"Thumbs/" + member + "/" + values.members[member].videos[category].thumb + "\" class=\"thumb\" onclick=\"thumbClick('" + member + "', '" + category + "')\"></a>";
      }
      tableHTML += "</td>";
    }
    tableHTML += "<tr>";
  }
  $("#vidTable").html(tableHTML);
}

function thumbClick(member, category) {
  var vidHTML = "<source src=\"Videos/" + member + "/" + values.members[member].videos[category].source + "\" type=\"" + values.members[member].videos[category].type + "\">"
  $("#video").html(vidHTML);
  $("#video").load();

  $("#mainTable")[0].scrollIntoView(); // I have spent hours on this shit and it does not work. FML

  $("#vidTitle").text(values.members[member].videos[category].title);
  $("#vidOriginal").text(values.members[member].videos[category].original);
  $("#vidDescription").text(values.members[member].videos[category].description);

  var elem = $("video")[0];
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen();
  } else if (elem.mozRequestFullScreen) {
    elem.mozRequestFullScreen();
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
  }
  elem.play();
}

function vidEnded() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}

function onFormSubmit(e) {
  var subject = $("#subject").val();
  var from = $("#from").val();
  var content = $("#content").val();

  if(subject == "") {
    $("#errorSpan").text("There needs to be a subject!");
    return;
  }
  if(from == "") {
    $("#errorSpan").text("There needs to be a sender!");
    return;
  }
  if(content == "") {
    $("#errorSpan").text("There needs to be content!");
    return;
  }

  console.log("blah");

  $("#errorSpan").text("");

  var to = [];
  for(var member in values.members) {
    to.push({
      email: values.members[member].email,
      name: member,
      type: "to"
    });
  }

  $.ajax({
    type: "POST",
    url: "https://mandrillapp.com/api/1.0/messages/send.json",
    data: {
      'key': 'XGC63WW2JNXqMwyEswTUxA',
      'message': {
        'from_email': from,
        'to': to,
        'autotext': "true",
        'subject': subject,
        'html': content
      }
    }
  }).done(function(response) {
    if(response[0].status = "sent") {
      $("#errorSpan").css("color", "green");
      $("#errorSpan").text("E-mail sent!");

      $("#subject").val("");
      $("#from").val("");
      $("#content").val("");
    }
  });

  return false;
}
