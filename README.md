# pilove
Client and server to coordinate two devices with lights and touch sensors

It started with this post on [Reddit](https://www.reddit.com/r/webdev/comments/42hp3v/having_raspberry_pis_communicate_through_a_server/)

> I am a comp eng student currently that is planning a project for my long distance girlfriend. The idea is rather simple. Two pencil case sized boxes that house a raspberry pi and a large light up translucent heart button on the top. These hearts, when pressed at the same time, would like up red or pink. If one is pressed and the other is not, the one that is not would pulse like a heart (a notification that the other is pressed). Its a pretty love sappy idea, but I know it would be really awesome and have a different level to it than phones, since it was just our thing.

> Since we both are on college network, I can not have them communicate directly, but I do have a personal web server back home that I use for streaming my content and as a seedbox back home. Im sure I can use this for them both to connect to and serve the pressed notification back and forth.

> My question is what is the easiest route for me to take here? Linux script with GET and POSTs? An prior existing application that I can repurpose? I am much more confident on the local side of things, like the manufacturing of the boxes, the wiring of the LEDs, etc.

> Thanks for any help on the matter! Have a nice day.

/u/bsmitty358 is working on a project for two Raspberry Pi computers to connect with his girlfriend at another college. [The current hardware design.](http://imgur.com/a/57adM)

/u/protonfish is a web developer that has been trying to learn more about the [Raspberry Pi](https://www.raspberrypi.org/), [node.js](https://nodejs.org/en/), and low-level network architecture. He is writing the client/server aspect of the project using [this article from Adafruit](https://learn.adafruit.com/node-embedded-development/why-node-dot-js) as a basis.

## Dependencies

The PiLove server requires the node module *express*.

The PiLove client requires the node module *onoff*.

## Server Admin

The server should be started something like this so it will keep running after the terminal is closed:

    nohup node piloveserver.js > /dev/null &

It's not working though. I'll need to get trying.
