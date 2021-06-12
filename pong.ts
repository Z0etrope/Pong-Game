//Jason Setiawan
//28083148
//jset0002@student.co.id
import { interval, fromEvent, from, zip, Subject, Observable } from 'rxjs'
import { map, scan, filter, merge, flatMap, take, concat, takeUntil} from 'rxjs/operators'

function pong() {
  // -----------------------------------------------------------Create Elements----------------------------------------------------------------------------------------
  const svg = document.getElementById("canvas")!;
  const leftScore = document.getElementById("leftScore")!;
  const rightScore = document.getElementById("rightScore")!;

  const rectLeft = document.createElementNS(svg.namespaceURI,'rect')
  Object.entries({
    x: 20, y: 260,
    width: 10, height: 80,
    fill: '#95B3D7',
    }).forEach(([key,val])=>rectLeft.setAttribute(key,String(val)))
    svg.appendChild(rectLeft);
  
  const rectRight = document.createElementNS(svg.namespaceURI,'rect')
  Object.entries({
    x: 570, y: 260,
    width: 10, height: 80,
    fill: '#95B3D7',
    }).forEach(([key,val])=>rectRight.setAttribute(key,String(val)))
    svg.appendChild(rectRight);

  const ball = document.createElementNS(svg.namespaceURI,'circle')
  Object.entries({
    cx:300, cy:300,
    r: 5,
    fill: '#95B3D7',
    speedx:-1,
    speedy:-1
    }).forEach(([key,val])=>ball.setAttribute(key,String(val)))
    svg.appendChild(ball);

  const winlimit = 7
  // -------------------------------------------------------------------------------------------------------------------------------
  //Observe the scores until either score reaches the winlimit
  //This observable is an input for takeUntil (takes until the winlimit is reached)
  
  const stop = interval(1)
  .pipe(
   filter(()=>(Number(leftScore.innerHTML)>=winlimit || Number(rightScore.innerHTML)>=winlimit))
  )
  
  // Set the player as left paddle 
  keyboardMove(rectLeft);
 
  //################################################# Keyboard EVENT ################################################################
  function keyboardMove(rect:Element){
    const keydown = fromEvent<KeyboardEvent>(document,"keydown");
    const movement = keydown.pipe(map(event=>event.key)).subscribe(
      key=>
      (key=='w' && Number(rect.getAttribute('y'))>=20)?
      rect.setAttribute('y', String(-50+ Number(rect.getAttribute('y'))))
      :(key=='s' && Number(rect.getAttribute('y'))<500)?
      rect.setAttribute('y', String(50 + Number(rect.getAttribute('y'))))
      : -1
      );
  }
  engine();


//########################################################## ENGINE #############################################################
  function engine(){
    //function that serves as the engine of the game
    //create observable as the game "time" until win limit is reached
    //this observable is the main observable
    const o = interval(1)
            .pipe(
              takeUntil(stop)
            )
    //Game Function initiation      
    moveBall();
    AI();
    winLose();

    function winLose() {
      //Function to subscribe the win prompt after winlimit is reached

      //Player Win
      interval(1).pipe(filter(()=>Number(leftScore.innerHTML)>=winlimit))
      .subscribe(()=>document.getElementById("Prompt")!.innerHTML = `Player Win!!!`)
      //AI win
      interval(1).pipe(filter(()=>Number(rightScore.innerHTML)>=winlimit))
      .subscribe(()=>document.getElementById("Prompt")!.innerHTML = `AI Win!!!`)
    }

    function AI() { 
      //Function to subscribe the movement of the AI based on the ball
        
      o.subscribe(()=>rectRight.setAttribute('y',String(Number(rectRight.getAttribute('y'))+Number(ball.getAttribute('speedy'))-0.01)))
    }

    function moveBall() { 
        //Function to subscribe the movement of the ball, change direction when bumping to bounds

        //subscribe ball movement
        o.subscribe(()=>{ball.setAttribute('cx',String(Number(ball.getAttribute('cx')) + Number(ball.getAttribute('speedx'))))
                      ball.setAttribute('cy',String(Number(ball.getAttribute('cy')) + Number(ball.getAttribute('speedy'))))
                    })

        
        //Observables for taking coordinates of ball, left paddle, and right paddle
        const ballArray = from([ball])
        const leftArray = from([rectLeft])
        const rightArray = from([rectRight])

        const ballCoordinates = o.pipe(
                                flatMap(()=>ballArray), //coordinates for the ball
                                map(b=>({x:Number(b.getAttribute('cx')),
                                y:Number(b.getAttribute('cy'))
        })))
        
        
        
        const leftCoordinates = ballCoordinates.pipe(flatMap(({x,y})=>leftArray.pipe( //coordinates for ball and left paddle
                                                  map(b=>({ball_x: x,
                                                           ball_y: y,
                                                           left_lower:Number(b.getAttribute('y')),
                                                           left_upper:Number(b.getAttribute('y'))+80
        })))))
                                                                  
        const rightCoordinates = ballCoordinates.pipe(flatMap(({x,y})=>rightArray.pipe( //coordinates for ball and right paddle
                                                   map(b=>({ball_x:x,
                                                            ball_y:y,
                                                            right_lower:Number(b.getAttribute('y')),
                                                   right_upper:Number(b.getAttribute('y'))+Number(b.getAttribute('height')) 
        })))))

        // Bounce Mechanic
        //########################################################### X-Axis ################################################################
        // Bounce when the ball hit top or bottom boundary 
        ballCoordinates.pipe(filter(({y})=>(y<=5))).subscribe(()=>reverse_y()); //ball bounces the upper bounds, reverse direction of y
        ballCoordinates.pipe(filter(({y})=>(y>=595))).subscribe(()=>reverse_y()); //ball bounces the lower bounds, reverse direction of y
        
        //########################################################### Y-Axis ################################################################

        //On Impact with paddle
        //ball bounces from left paddle
        leftCoordinates 
          .pipe(filter(({ball_x,ball_y,left_lower,left_upper})=>((ball_x <= 30) && (ball_y<=left_upper) && (ball_y>=left_lower))))
          .subscribe(()=> reverse_x()); //reverse the direction of x

        //ball bounces from right paddle
        rightCoordinates 
        .pipe(filter(({ball_x,ball_y,right_lower,right_upper})=>((ball_x >= 570) && (ball_y<=right_upper) && (ball_y>=right_lower))))
        .subscribe(()=>reverse_x()); //reverse the direction of x


        const leftGoal = leftCoordinates //ball passes left paddle, increase AI score by one and reset the position of the AI and the ball
        .pipe(filter(({ball_x,ball_y,left_lower,left_upper})=>((ball_x<=0) && ((ball_y>left_upper) || (ball_y<left_lower)))));

        leftGoal.subscribe(()=>{ball.setAttribute('speedx',String(1))
                                ball.setAttribute('cx',String(200))
                                ball.setAttribute('cy',String(300))
                                rectRight.setAttribute('y',String(260))
                                rightScore.innerHTML = `${Number(rightScore.innerHTML)+1}`;
        }); 

        const rightGoal = rightCoordinates //ball passes right paddle, increase player score by one and reset the position of the AI and the ball
        .pipe(filter(({ball_x,ball_y,right_lower,right_upper})=>((ball_x >= 600) && ((ball_y>right_upper) || (ball_y<right_lower)))));
        
        rightGoal.subscribe(()=> {ball.setAttribute('speedx',String(1))
                                  ball.setAttribute('cx',String(200))
                                  ball.setAttribute('cy',String(300))
                                  rectRight.setAttribute('y',String(260))
                                  leftScore.innerHTML = `${Number(leftScore.innerHTML)+1}`;
                  });
        //############################################ Reverse #############################################################
        //Function for reversing direction of the ball
        const reverse_x = () => { //reverse the direction of the ball horizontally
            ball.setAttribute('speedx',String(Number(ball.getAttribute('speedx'))*(-1)))
        }
        const reverse_y = () => { //reverse the direction of the ball vertically
            ball.setAttribute('speedy',String(Number(ball.getAttribute('speedy'))*(-1)))
        }
    }
   }
}
 
  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    window.onload = ()=>{
      pong();
    }
