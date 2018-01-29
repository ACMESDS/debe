function takequiz(rev,doc,nav,state) {
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
		quizContainer.innerHTML = output.join('');
	}

	function showResults(){
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
		resultsContainer.innerHTML = numCorrect + ' out of ' + myQuestions.length;

		// notify proctor
		nav.ajax( 
			"GET", true, 
			 `/proctor?lesson=${lesson}&score=${100*numCorrect/myQuestions.length}&pass=${pass}`,
			function (rtn) {
				alert(rtn);
			}
		);
	}
		
	var 
		slide = rev.getCurrentSlide(),
		ctrls = slide.getElementsByClassName("quiz");
	
	if ( ctrls.length >= 3) {
		var
			quizes = nav.totem.quizes;
			quizContainer = ctrls[0], //doc.getElementById('quiz'),
			submitButton = ctrls[1], //doc.getElementById('submit');
			resultsContainer = ctrls[2], //doc.getElementById('results'),
			lesson = slide.getAttribute("lesson"),
			pass = slide.getAttribute("pass");

		if (state) {
			var 
				myQuestions = [],
				myQuiz = quizes[lesson];

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
	
	else
		alert("No quiz on this slide");
}

navigator.totem.quizes = {

module1: [
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

module2: [
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
