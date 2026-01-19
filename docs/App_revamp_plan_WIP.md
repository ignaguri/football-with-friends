## App revamp plan

### Home page

- Whenever someone navigates to home, a modal will show up with the General rules
- The modal will have a close button and a button to go to the rules page and another that says "I already read the rules"
- When the user clicks on "I already read the rules", the modal will close and the user will be redirected to the home page
- When the user clicks on "Go to rules", the modal will close and the user will be redirected to the rules page


### Matches page

- We need some job that will update the state of the matches based on the date and time
- Only show a max of 5 matches at a time for both upcoming and past matches, with load more or pagination

### Menu

- for admins: add match only works on the organizer page, fix that


### Admin page

- implement "substitutions" feature
    - We will add a field for setting the max amount of substitution players they can be per match
    - This will allow users to join a match even when the max amount of players is full and they will join with a new state that will be "Substitute"
- rethink costs and how they are displayed
    - remove shirts cost from the match creation form
    - There should be a setting for admins where they set the price of a match. Then there will also be a price for one joining on the same date of the match, and so far these two. But let's leave it abstract enough so that we can add another extra cost next item.
    - Every match creation will allow to modify this special price, but they will load the defaults from the settings at first instance