String.prototype.tag = function tag(el,at,eq) {
/**
@method tag
Tag url (el=?) or tag html (el=html tag) with specified attributes.
@param {String} el tag element
@param {String} at tag attributes
@return {String} tagged results
*/

	if ( el == "?" || el == "&" ) {  // tag a url
		var rtn = this+el;

		for (var n in at) {
			var val = at[n];
			rtn += n + (eq||"=") + ((typeof val == "string") ? val : JSON.stringify(val)) + "&"; 
		}

		return rtn;	
	}

	else {  // tag html
		var rtn = "<"+el+" ";

		for (var n in at) {
			var val = at[n];
			rtn += n + "='" + val + "' ";
		}

		switch (el) {
			case "embed":
			case "img":
			case "link":
			case "input":
				return rtn+">" + this;
			default:
				return rtn+">" + this + "</"+el+">";
		}
	}
}

function takequiz(state) {
	function clearQuiz() {
		quizContainer.innerHTML = "";
		resultsContainer.innerHTML = "";
	}
	
	function buildQuiz(){
		var output = [];   // we'll need a place to store the HTML output

		myQuestions.forEach( (currentQuestion, questionNumber) => {
		  var answers = [];   // we'll want to store the list of answer choices

		  for(letter in currentQuestion.answers){  // and for each available answer...

			answers.push(  // ...add an HTML radio button
			  `<label>
				<input type="radio" name="question${questionNumber}" value="${letter}">
				${letter} :
				${currentQuestion.answers[letter]}
			  </label>`
			);
		  }

		  output.push(  // add this question and its answers to the output
			`<div class="question"> ${currentQuestion.question} </div>
			<div class="answers"> ${answers.join('')} </div>`
		  );
		});

		// finally combine our output list into one string of HTML and put it on the page
		quizContainer.innerHTML = 
			`Module${mod}-${mods}.${set}: ` + output.join('');
	}

	function showResults(){
		
		function sendScore() { // notify proctor
			//alert("ajax");
			BASE.Ajax( 
				"GET", true, 
				 `/proctor?lesson=${lesson}&score=${100*numCorrect/myQuestions.length}&pass=${pass}&modules=${mods}`,
				function (rtn) {
					alert(rtn);
				}
			);
		}

		// gather answer containers from our quiz
		var answerContainers = quizContainer.querySelectorAll('.answers');

		// keep track of user's answers
		var numCorrect = 0;

		// for each question...
		myQuestions.forEach( (currentQuestion, questionNumber) => {

			// find selected answer
			var answerContainer = answerContainers[questionNumber];
			var selector = 'input[name=question'+questionNumber+']:checked';
			var userAnswer = (answerContainer.querySelector(selector) || {}).value;

			if(userAnswer===currentQuestion.correctAnswer){ // if answer is correct color the answers green
				numCorrect++;
				answerContainers[questionNumber].style.color = 'lightgreen';
			}

			else    //  if answer is wrong or blank color the answers red     
				answerContainers[questionNumber].style.color = 'red';

	  });

		// show number of correct answers out of total
		resultsContainer.innerHTML = (myQuestions.length>1)
				? numCorrect + ' out of ' + myQuestions.length
				: numCorrect
					? "pass"
					: "fail";
		
		sendScore();

	}

	//console.log("state in", state);
	var 
		rev = state.rev,
		slide = rev.getCurrentSlide(),
		ctrls = slide.getElementsByClassName("quiz");
	
	//console.log(rev, slide, ctrls, ctrls.length, BASE.Ajax);
	
	if ( ctrls.length >= 3 ) {
		var
			quizContainer = ctrls[0], //doc.getElementById('quiz'),
			submitButton = ctrls[1], //doc.getElementById('submit');
			resultsContainer = ctrls[2], //doc.getElementById('results'),
			
			lesson = slide.getAttribute("lesson") || "",
			mods = slide.getAttribute("modules") || "1",
			pass = slide.getAttribute("pass") || "100",
				
			parts = lesson.split("."),
			topic = parts[0],
			mod = parseInt( parts[1] ) || 1,
			set = parseInt( parts[2] ) || 1;

		if ( slide != state.slide ) {
			state.slide = slide;
			state.take = true;
		}
		
		else 
			state.take = !state.take;
		
		//console.log("state out", state);
		
		if ( state.take )  {
			var 
				myQuestions = [],
				myQuiz = BASE.Quizes[topic+"."+mod+"."+set] || BASE.Quizes["default"];

			//console.log(myQuiz);
			
			if (myQuiz) {
				myQuiz.forEach( (quiz,n) => {
					myQuestions.push({
						question: 
							quiz.Q
								.replace(/\n/g, "<br>")
								.replace(/\[.*?\]/g, function (m) {
									return m.substr(1,m.length-2).tag("div",{class:"in"});
								}),
						correctAnswer: quiz.A,
						answers: quiz.S
					});
				});

				buildQuiz();  // display quiz right away

				submitButton.addEventListener('click', showResults);  // on submit, show results
			}

			else
			if (lesson)
				alert(`Lesson ${lesson} does not exist`);
		}

		else 
			clearQuiz();
			
	}
	
}

//==============================================
// Below should be modified as needed.  Entires should follow the topic.module.set convention. See
// the /exquiz.view for usage example.

BASE.Quizes = {  
	
"machines.1.1": [ {
	Q: "Machine learning has been around?",
	S: {
		a: "since the dawn of the computer",
		b: "for the last 10 years",
		c: "for a million years"
	},
	A: "a"
}],
	
"machines.1.2": [{
	Q: "Who invented machine learning?",
	S: {
		a: "Google",
		b: "Facebook",
		c: "Amazon",
		d: "IBM",
		e: "a lot of smart people"
	},
	A: "e"
}],
	
"machines.1.3": [{
	Q: "Training a GPU consumes more than X (Y) times the power used in a car's (US persons') lifetime?",
	S: {
		a: "half (same)",
		b: "tenth (half)",
		c: "5 (20)",
		d: "I dont care"
	},
	A: "c"
}],
	
"machines.2.1": [{
	Q: "half of the US GDP during the last 10 years was allocated to?",
	S: {
		a: "you",
		b: "South African Swallows",
		c: "interest on the debt",
		d: "GPUs"
	},
	A: "d"
}],
	
"machines.2.2": [{
	Q: "half of the US GDP during the last 10 years was allocated to?",
	S: {
		a: "you",
		b: "South African Swallows",
		c: "interest on the debt",
		d: "GPUs"
	},
	A: "d"
}],
	
"machines.2.3": [{
	Q: "training a machine requires?",
	S: {
		a: "a model, data and power",
		b: "labeled data and power",
		c: "interest on the debt",
		d: "jupyter notebooks"
	},
	A: "a"},  {
	Q: "good models for machine learners include?",
	S: {
		a: "Cindy Crawford, David Gandy, Jelena Naura, Naomi Campbell",
		b: "flat earth",
		c: "global warming",
		d: "Markov, Wiener, Ohrenstein, Gaussian, Bayes"
	},
	A: "d"
}],
	
"machines.2.4": [{
	Q: "good models for machine learners include?",
	S: {
		a: "Cindy Crawford, David Gandy, Jelena Naura, Naomi Campbell",
		b: "flat earth",
		c: "global warming",
		d: "Markov, Wiener, Ohrenstein, Gaussian, Bayes"
	},
	A: "d"
}], 
	
"machines.2.5": [{
	Q: "which language do machine learners require?",
	S: {
		a: "python",
		b: "matlab",
		c: "c",
		d: "mathematics"
	},
	A: "d"
}], 

"machines.2.6": [{
	Q: "The Googlers now refer to the ancient gaussian mixing problem as?",
	S: {
		a: "supervised learning",
		b: "EM, clustering, semisupervised learning",
		c: "transfer learning",
		d: "hypothesis boosting"
	},
	A: "b"
}], 

"machines.2.7": [{
	Q: "How did US founders boost each hypothesis considered by our congress?",
	S: {
		a: "jerry mandering",
		b: "majority voting",
		c: "transfer learning"
	},
	A: "b"
}], 

"machines.2.8": [{
	Q: "If we are innocent until proven guilty, how does a ROC start from a field of negatives?",
	S: {
		a: "too deep for me",
		b: "pure luck",
		c: "transfer learning"
	},
	A: "a"
}], 

"machines.2.9": [{
	Q: "If I gave you a coin and you *knew* it was fair (trivial ROC), could you make money?",
	S: {
		a: "I sure hope so",
		b: "no I need a ROC approaching nirvanna",
		c: "only if the ROC uniformly grows"
	},
	A: "a"
}], 

"default.3.1": [
{
	Q: "Who is the strongest?",
	S: {
		a: "Superman",
		b: "The Terminator",
		c: "Waluigi, obviously"
	},
	A: "c"
}, 	{
	Q: "What is the best site ever created?",
	S: {
		a: "SitePoint",
		b: "Simple Steps Code",
		c: "Trick question; they're both the best"
	},
	A: "c"
}
], 

"default.3.2": [
{
	Q: "the best " + "color?".tag("img",{src:"/shares/a1.jpg"}),
	S: {
		a: "red",
		b: "green",
		c: "blue",
		d: "all of the above"
	},
	A: "d"
}
]
	
};
