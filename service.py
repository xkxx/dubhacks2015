import redis
import operator
import ast
r = redis.StrictRedis(db=1)

def getData(input):
    allword = []
    wordList = input.lower().split()
    listlen = len(wordList) - 1
    curr = wordList[listlen]
    while True:
        if r.exists(curr) >= 1:
            result = r.zrange(curr, 0, 5, withscores=True)
            for element in result:
                allword.append(element)
        if listlen == 0:
            break
        listlen -= 1
        curr = wordList[listlen] + " " + curr
    sorted(allword, key=operator.itemgetter(1))
    strSorted = []
    for word in allword:
        value, freq = ast.literal_eval(word[0]), word[1]
        strValue = ""
        for element in value:
            strValue += element
        strSorted.append((strValue, freq))
    return strSorted

result = getData('to')
print result
