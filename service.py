import redis
import operator
import ast
import userCustomize

LENGTH_WEIGHT = 1.5
r = redis.StrictRedis(db=1)

def getData(input):

    allword = []
    wordList = input.split()
    index = len(wordList) - 1
    curr = wordList[index]
    while True:
        if index > 0:
            userCustomize.userCustomize(wordList[index - 1], curr)
        if r.exists(curr) >= 1:
            result = r.zrevrange(curr, 0, 5, withscores=True)
            for element in result:
                val = ast.literal_eval(element[0])
                allword.append(val, element[1] + LENGTH_WEIGHT
                    * (len(val) + (len(wordList) - index)))
            result = r.zrevrange(curr.lower(), 0, 5, withscores=True)
            for element in result:
                val = ast.literal_eval(element[0])
                allword.append(val, element[1] + LENGTH_WEIGHT
                    * (len(val) + (len(wordList) - index)))
        if index == 0:
            break
        index -= 1
        curr = wordList[index] + " " + curr
        allword = sorted(allword, key=operator.itemgetter(1), reverse=True)
    return [' '.join(list(word[0])) for word in allword[0:5]]
