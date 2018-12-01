/* eslint-disable  func-names */
/* eslint-disable  no-console */
/* eslint-disable  no-restricted-syntax */

// IMPORTANT: Please note that this template uses Dispay Directives,
// Display Interface for your skill should be enabled through the Amazon developer console
// See this screenshot - https://alexa.design/enabledisplay

const data = require('./signData.json')
const Alexa = require('ask-sdk-core');

const numQuestions = 5;

/* INTENT HANDLERS */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === `LaunchRequest`;
  },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.quizHasStarted = false;
        handlerInput.attributesManager.setSessionAttributes(attributes);

        const response = handlerInput.responseBuilder;
        console.log('launch request');
        if (supportsDisplay(handlerInput)) {
        console.log('display supported');
            const title = `UK Traffic Signs Quiz`;
            const image = new Alexa.ImageHelper().addImageInstance(getLargeImage({name:'traffic'})).getImage();
            console.log('adding template');
            response.addRenderTemplateDirective({
                type: 'BodyTemplate7',
                backButton: 'HIDDEN',
                image: image,
                title: title,
            });
        } else {

            console.log('no display support');
            const imageUrl = getLargeImage({name:'traffic'});
            //response.withStandardCard('UK Traffic Signs Quiz','Would you like to play?', imageUrl, imageUrl);
        }

        const message = supportsDisplay(handlerInput) ? welcomeMessage : welcomeMessageNoScreen;
        return response
            .speak(message)
            .reprompt(helpMessage)
            .getResponse();
    },
};

const StartQuizHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log(JSON.stringify(request));

    const attributes = handlerInput.attributesManager.getSessionAttributes();
      return request.type === "IntentRequest" &&
          (request.intent.name === "AMAZON.StartOverIntent" || 
              (!attributes.quizHasStarted && request.intent.name === "AMAZON.YesIntent"));
  },
  handle(handlerInput) {
    console.log("Inside QuizHandler - handle");
    const response = handlerInput.responseBuilder;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    attributes.quizHasStarted = true;
    attributes.state = states.QUIZ;
    attributes.counter = 0;
    attributes.quizScore = 0;
    handlerInput.attributesManager.setSessionAttributes(attributes);
    var question = askQuestion(handlerInput);
    //var speakOutput = startQuizMessage + question;
    var speakOutput = question;
    var repromptOutput = question;

    const item = attributes.quizItem;
    const property = attributes.quizProperty;

    if (supportsDisplay(handlerInput)) {
        console.log('adding display');
      const title = `Question ${attributes.counter}`;
      const primaryText = new Alexa.RichTextContentHelper().withPrimaryText(getQuestionWithoutOrdinal(item)).getTextContent();
      const image = new Alexa.ImageHelper().addImageInstance(getLargeImage(attributes.quizItem)).getImage();
        console.log('got image', image);
      const itemList = [];
      getAndShuffleMultipleChoiceAnswers(attributes.selectedItemIndex, item, property).forEach((x, i) => {
        itemList.push(
          {
            "token" : x,
            "textContent" : new Alexa.PlainTextContentHelper().withPrimaryText(x).getTextContent(),
          }
        );
      });
      response.addRenderTemplateDirective({
        type : 'BodyTemplate7',
        token : 'Question',
        backButton : 'hidden',
        image,
        title,
      });
    } else {

      const image = getLargeImage(attributes.quizItem);
      //    response.withStandardCard(`Question ${attributes.counter}`,'What is this sign?', image, image)
    }

    return response.speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
  },
};

const NextQuestionHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log(JSON.stringify(request));


    const attributes = handlerInput.attributesManager.getSessionAttributes();
      return request.type === "IntentRequest" &&
              (attributes.quizHasStarted && request.intent.name === "AMAZON.YesIntent");
  },
  handle(handlerInput) {

    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const response = handlerInput.responseBuilder;

    if (attributes.counter < numQuestions) {
    console.log('NextQuestionHandler');
    var question = askQuestion(handlerInput);
    console.log('question is', question);
    //var speakOutput = startQuizMessage + question;
    var speakOutput = question;
    var repromptOutput = question;

    const item = attributes.quizItem;
    const property = attributes.quizProperty;

    if (supportsDisplay(handlerInput)) {
        console.log('adding display');
      const title = `Question ${attributes.counter}`;
      const primaryText = new Alexa.RichTextContentHelper().withPrimaryText(getQuestionWithoutOrdinal(item)).getTextContent();
      const image = new Alexa.ImageHelper().addImageInstance(getLargeImage(attributes.quizItem)).getImage();
        console.log('got image', image);
      const itemList = [];
      getAndShuffleMultipleChoiceAnswers(attributes.selectedItemIndex, item, property).forEach((x, i) => {
        itemList.push(
          {
            "token" : x,
            "textContent" : new Alexa.PlainTextContentHelper().withPrimaryText(x).getTextContent(),
          }
        );
      });
      console.log('adding render template');
      response.addRenderTemplateDirective({
        type : 'BodyTemplate7',
        token : 'Question',
        backButton : 'hidden',
        image,
        title,
      });
    }
      console.log('returning response');

      const image = getLargeImage(attributes.quizItem);
    return response.speak(speakOutput)
            .withStandardCard(`Question ${attributes.counter}`,'What is this sign?', image, image)
                   .reprompt(repromptOutput)
                   .getResponse();

    } else {
        //show final score
      speakOutput = getFinalScore(attributes.quizScore, attributes.counter) + exitSkillMessage;
      if(supportsDisplay(handlerInput)) {
        const title = 'Thank you for playing';
        const primaryText = new Alexa.RichTextContentHelper().withPrimaryText(getFinalScore(attributes.quizScore, attributes.counter)).getTextContent();
        response.addRenderTemplateDirective({
          type : 'BodyTemplate1',
          backButton: 'hidden',
          title,
          textContent: primaryText,
        });
      }
      return response.speak(speakOutput)
      .withShouldEndSession(true).getResponse();
    }
  },
};

const QuizAnswerHandler = {
  canHandle(handlerInput) {
    console.log("Inside QuizAnswerHandler");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const request = handlerInput.requestEnvelope.request;

    return attributes.state === states.QUIZ &&
           request.type === 'IntentRequest' &&
           request.intent.name === 'AnswerIntent';
  },
  handle(handlerInput) {
    console.log("Inside QuizAnswerHandler - handle");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const response = handlerInput.responseBuilder;

    var speakOutput = ``;
    var repromptOutput = ``;
    const item = attributes.quizItem;
    const isCorrect = compareSlots(handlerInput.requestEnvelope.request.intent.slots, item.name);


    speakOutput = getSpeechCon(isCorrect) + getAnswer(item, isCorrect);

    if (isCorrect) {
      attributes.quizScore += 1;
      handlerInput.attributesManager.setSessionAttributes(attributes);

    var question = ``;
    //IF YOUR QUESTION COUNT IS LESS THAN numQuestions, WE NEED TO ASK ANOTHER QUESTION.
    if (attributes.counter < numQuestions) {
      question = askQuestion(handlerInput);
      speakOutput += question;
      repromptOutput = question;

      if (supportsDisplay(handlerInput)) {
          const title = `Question ${attributes.counter}`;
          const primaryText = new Alexa.RichTextContentHelper().withPrimaryText(getQuestionWithoutOrdinal(attributes.quizItem)).getTextContent();

          const image = new Alexa.ImageHelper().addImageInstance(getLargeImage(attributes.quizItem)).getImage();
        response.addRenderTemplateDirective({
          type: 'BodyTemplate7',
          backButton: 'HIDDEN',
          image: image,
          title: title,
        });
      }

      const image = getLargeImage(attributes.quizItem);
      return response.speak(speakOutput)
            .withStandardCard(`Question ${attributes.counter}`,'What is this sign?', image, image)
      .reprompt(repromptOutput)
      .getResponse();
    }
    else {
      speakOutput += getFinalScore(attributes.quizScore, attributes.counter) + exitSkillMessage;
      if(supportsDisplay(handlerInput)) {
        const title = 'Thank you for playing';
        const primaryText = new Alexa.RichTextContentHelper().withPrimaryText(getFinalScore(attributes.quizScore, attributes.counter)).getTextContent();
        response.addRenderTemplateDirective({
          type : 'BodyTemplate1',
          backButton: 'hidden',
          title,
          textContent: primaryText,
        });
      }
      return response.speak(speakOutput)
            .withShouldEndSession(true).getResponse();
    }

    } else {
      // USER was wrong

    if (attributes.counter < numQuestions) {
        speakOutput += "Are you ready for the next question?";
    } else {
        speakOutput += "Would you like to see your score?";
    }
    //IF YOUR QUESTION COUNT IS LESS THAN numQuestions, WE NEED TO ASK ANOTHER QUESTION.
      repromptOutput = question;

      if (supportsDisplay(handlerInput)) {
          const title = `Answer: ${attributes.quizItem.name}`;
          const primaryText = new Alexa.RichTextContentHelper().withPrimaryText(getQuestionWithoutOrdinal(attributes.quizItem)).getTextContent();
          console.log(getLargeImage(attributes.quizItem));

          const image = new Alexa.ImageHelper().addImageInstance(getLargeImage(attributes.quizItem)).getImage();
        response.addRenderTemplateDirective({
          type: 'BodyTemplate7',
          image: image,
          title: title,
        });
      }

      const image = getLargeImage(attributes.quizItem);
      return response.speak(speakOutput)
            .withStandardCard(`Answer`,`This sign means ${attributes.quizItem.name}.`, image, image)
      .reprompt(repromptOutput)
      .getResponse();


    }

  },
};

const RepeatHandler = {
  canHandle(handlerInput) {
    console.log("Inside RepeatHandler");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const request = handlerInput.requestEnvelope.request;

    return attributes.state === states.QUIZ &&
           request.type === 'IntentRequest' &&
           request.intent.name === 'AMAZON.RepeatHandler';
  },
  handle(handlerInput) {
    console.log("Inside RepeatHandler - handle");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const question = getQuestion(attributes.counter, attributes.quizitem);

    return handlerInput.responseBuilder
      .speak(question)
      .reprompt(question)
      .getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    console.log("Inside HelpHandler");
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
           request.intent.name === 'AMAZON.HelpHandler';
  },
  handle(handlerInput) {
    console.log("Inside HelpHandler - handle");
    return handlerInput.responseBuilder
      .speak(helpMessage)
      .reprompt(helpMessage)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    console.log("Inside ExitHandler");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const request = handlerInput.requestEnvelope.request;

    return request.type === `IntentRequest` && (
              request.intent.name === 'AMAZON.StopIntent' ||
              request.intent.name === 'AMAZON.PauseIntent' ||
              request.intent.name === 'AMAZON.CancelIntent'
           );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(exitSkillMessage)
      .withShouldEndSession(true)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    console.log("Inside SessionEndedRequestHandler");
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    console.log("Inside ErrorHandler");
    return true;
  },
  handle(handlerInput, error) {
    console.log("Inside ErrorHandler - handle");
    console.log(`Error handled: ${JSON.stringify(error)}`);
    console.log(`Handler Input: ${JSON.stringify(handlerInput)}`);

    return handlerInput.responseBuilder
      .speak(helpMessage)
      .reprompt(helpMessage)
      .getResponse();
  },
};

/* CONSTANTS */
const skillBuilder = Alexa.SkillBuilders.custom();
const imagePath = "https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/quiz-game/state_flag/{0}x{1}/{2}._TTH_.png";
const backgroundImagePath = "https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/quiz-game/state_flag/{0}x{1}/{2}._TTH_.png"
const speechConsCorrect = ['Great', 'Correct', 'Bingo', 'Bravo', 'Hurrah', 'Hurray', 'Huzzah', 'Well done'];
const speechConsWrong = ['Nope.', 'No', 'Wrong'];

const states = {
  START: `_START`,
  QUIZ: `_QUIZ`,
};

const welcomeMessage = `Welcome to the UK traffic signs quiz! I'm going to show you ${numQuestions} traffic signs, and you have to tell me what they mean. Are you ready to play?`;
const welcomeMessageNoScreen = `Welcome to the UK traffic signs quiz! You will need a device with a screen to play, or look at the cards in the Alexa companion app. I'm going to show you ${numQuestions} traffic signs, and you have to tell me what they mean. Are you ready to play?`;
const startQuizMessage = `Welcome to the UK traffic sign quiz!  Can you get all ${numQuestions} traffic signs correct? Here is your first question. `;
const exitSkillMessage = `Thank you for playing!  Drive Safely!`;
const helpMessage = `I can test you on UK traffic signs. Would you like to play?`;

/* HELPER FUNCTIONS */

// returns true if the skill is running on a device with a display (show|spot)
function supportsDisplay(handlerInput) {
  var hasDisplay =
    handlerInput.requestEnvelope.context &&
    handlerInput.requestEnvelope.context.System &&
    handlerInput.requestEnvelope.context.System.device &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display
  return hasDisplay;
}

function getFinalScore(score, counter) {
  return `Your final score is ${score} out of ${counter}. `;
}

function getSmallImage(item) {
    const formattedName = item.name.toLowerCase().replace(' ','-');
    return `https://s3-eu-west-1.amazonaws.com/alexa-traffic-signs-quiz/${formattedName}.jpg`;
}

function getLargeImage(item) {
    console.log('getting large image for', item);
    const formattedName = item.name.toLowerCase().replace(/ /g,'-');
    console.log('formatted name is', formattedName);
    return `https://s3-eu-west-1.amazonaws.com/alexa-traffic-signs-quiz/${formattedName}.jpg`;
}

function getImage(height, width, label) {
  return imagePath.replace("{0}", height)
    .replace("{1}", width)
    .replace("{2}", label);
}

function getQuestion(counter, item) {
  return `Question ${counter}. What does this sign mean?`;
}

// getQuestionWithoutOrdinal returns the question without the ordinal and is
// used for the echo show.
function getQuestionWithoutOrdinal(item) {
  return "What is this sign?";
}

function getAnswer(item, isCorrect) {
    if (isCorrect)
    return `Yes, that sign meant ${item.name}. `;
    else
    return `It actually means ${item.name}. `;
}

function getRandom(min, max) {
  return Math.floor((Math.random() * ((max - min) + 1)) + min);
}

function askQuestion(handlerInput) {
  console.log("I am in askQuestion()");
  //GENERATING THE RANDOM QUESTION FROM DATA
  const random = getRandom(0, data.length - 1);
  const item = data[random];

  //GET SESSION ATTRIBUTES
  const attributes = handlerInput.attributesManager.getSessionAttributes();

  //SET QUESTION DATA TO ATTRIBUTES
  attributes.selectedItemIndex = random;
  attributes.quizItem = item;
  attributes.counter += 1;

  //SAVE ATTRIBUTES
  handlerInput.attributesManager.setSessionAttributes(attributes);

  const question = getQuestion(attributes.counter, item);
  return question;
}

function compareSlots(slots, value) {
  for (const slot in slots) {
    if (Object.prototype.hasOwnProperty.call(slots, slot) && slots[slot].value !== undefined) {


        console.log('matched values will be', slots[slot].resolutions.resolutionsPerAuthority);
        const matchedValues = slots[slot].resolutions.resolutionsPerAuthority[0].values;
        console.log('matched values is', matchedValues);
        if (matchedValues) {
            for (let i=0; i < matchedValues.length; i++) {
                console.log('testing candidate', matchedValues[i]);
                if (matchedValues[i].value.name.toString().toLowerCase() === value.toString().toLowerCase()) {
                    return true;
                }
            }


        }

      //if (slots[slot].value.toString().toLowerCase() === value.toString().toLowerCase()) {
      //  return true;
      //}
    }
  }

  return false;
}

function getItem(slots) {
  const propertyArray = Object.getOwnPropertyNames(data[0]);
  let slotValue;

  for (const slot in slots) {
    if (Object.prototype.hasOwnProperty.call(slots, slot) && slots[slot].value !== undefined) {
      slotValue = slots[slot].value;
      for (const property in propertyArray) {
        if (Object.prototype.hasOwnProperty.call(propertyArray, property)) {
          const item = data.filter(x => x[propertyArray[property]]
            .toString().toLowerCase() === slots[slot].value.toString().toLowerCase());
          if (item.length > 0) {
            return item[0];
          }
        }
      }
    }
  }
  return slotValue;
}

function getSpeechCon(type) {
  if (type) return `<say-as interpret-as='interjection'>${speechConsCorrect[getRandom(0, speechConsCorrect.length - 1)]}! </say-as><break strength='strong'/>`;
  return `<say-as interpret-as='interjection'>${speechConsWrong[getRandom(0, speechConsWrong.length - 1)]} </say-as><break strength='strong'/>`;
}


function getAndShuffleMultipleChoiceAnswers(currentIndex, item, property) {
  return shuffle(getMultipleChoiceAnswers(currentIndex, item, property));
}

// This function randomly chooses 3 answers 2 incorrect and 1 correct answer to
// display on the screen using the ListTemplate. It ensures that the list is unique.
function getMultipleChoiceAnswers(currentIndex, item, property) {

  // insert the correct answer first
  let answerList = [item[property]];

  // There's a possibility that we might get duplicate answers
  // 8 states were founded in 1788
  // 4 states were founded in 1889
  // 3 states were founded in 1787
  // to prevent duplicates we need avoid index collisions and take a sample of
  // 8 + 4 + 1 = 13 answers (it's not 8+4+3 because later we take the unique
  // we only need the minimum.)
  let count = 0
  let upperBound = 12

  let seen = new Array();
  seen[currentIndex] = 1;

  while (count < upperBound) {
    let random = getRandom(0, data.length - 1);

    // only add if we haven't seen this index
    if ( seen[random] === undefined ) {
      answerList.push(data[random][property]);
      count++;
    }
  }

  // remove duplicates from the list.
  answerList = answerList.filter((v, i, a) => a.indexOf(v) === i)
  // take the first three items from the list.
  answerList = answerList.slice(0, 3);
  return answerList;
}

// This function takes the contents of an array and randomly shuffles it.
function shuffle(array) {
  let currentIndex = array.length, temporaryValue, randomIndex;

  while ( 0 !== currentIndex ) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

/* LAMBDA SETUP */
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    StartQuizHandler,
    NextQuestionHandler,
    QuizAnswerHandler,
    RepeatHandler,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
