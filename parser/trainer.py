from nltk.util import ngrams
import nltk
from os import listdir
import re
import redis
import ast

N = 5  # ngram from 2 to (N - 1)
DATA_DIR = 'testdataset/'
REGEX = "^[(0-9)\W]+|com|http$"
FREQUENCY_THRESHOLD = 2

NGram = list()

redis_ngram = redis.StrictRedis(host='localhost', port=6379, db=0)
redis_ho = redis.StrictRedis(host='localhost', port=6379, db=1)

def everygrams(tokens):
    retlist = list()
    for i in range(2, N):
        generated_ngram = list(ngrams(tokens, i))
        retlist.extend(generated_ngram)
    return retlist

def buildNGram():
    files = [open(DATA_DIR + filename).read()
        for filename in listdir(DATA_DIR)]

    sentences = list()
    for lines in [file.split('\n') for file in files]:
        for line in lines:
            lineTokens = line.split('\t')
            if len(lineTokens) > 1:
                sentences.append(lineTokens[1])

    for sentence in sentences:
        tokens = nltk.word_tokenize(sentence)
        pattern = re.compile(REGEX)
        validWords = [token for token in tokens if not pattern.match(token)]
        NGram.extend(everygrams(validWords))

def getNGram():
    return NGram

def serializeNGram():
    for gram in NGram:
        redis_ngram.incr(gram)

def incrHintOptions(oldcursor):
    cursor, gramPage = redis_ngram.scan(oldcursor)
    for gram in gramPage:
        freq = redis_ngram.get(gram)
        if freq >= FREQUENCY_THRESHOLD:
            # save hint -> option pair to redis
            wordList = ast.literal_eval(gram)
            hint = wordList[0]
            options = wordList[1:]
            redis_ho.zincrby(hint, options, 1)
    return cursor

# scanForCommonGramsAndBuildHintOptionsStructure
def trainModel():
    cursor = incrHintOptions(0)
    while cursor != 0:
        incrHintOptions(cursor)

buildNGram()
serializeNGram()
trainModel()
