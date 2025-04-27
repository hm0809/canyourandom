import random
string = ""
for i in range(40):
    string = ""
    for i in range(125):
        # Generate a random number between 1 and 100
        num = random.randint(0, 9)
        # Append the number to the string
        string += str(num)
    print("\n\n" + string)