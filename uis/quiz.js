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
			state.nav.ajax( 
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

	var 
		nav = state.nav,
		rev = state.rev,
		slide = rev.getCurrentSlide(),
		ctrls = slide.getElementsByClassName("quiz");
	
	if ( ctrls.length >= 3 ) {
		var
			quizes = nav.totem.quizes,
			
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
		
		if ( state.take )  {
			var 
				myQuestions = [],
				myQuiz = quizes[topic+"."+mod+"."+set];

			if (myQuiz) {
				myQuiz.forEach( (quiz,n) => {
					myQuestions.push({
						question: quiz.Q,
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

navigator.totem.quizes = {  // topic.module.set
	
"swag.1.1": [
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
}, 	{
	Q: "Where is Waldo really?",
	S: {
		a: "Antarctica",
		b: "Exploring the Pacific Ocean",
		c: "Sitting in a tree",
		d: "Minding his own business, so stop asking"
	},
	A: "d"
}
], 

"swag.1.2": [
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

"swag.2.1": [
{
	Q: "the best color?",
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
