from nltk.util import ngrams
import nltk
from os import listdir
import re
import redis

N = 5  # ngram from 2 to (N - 1)
DATA_DIR = 'testdataset/'
REGEX = "^[(0-9)\W]+|com|http$"

NGram = list()

rd = redis.StrictRedis()

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
        rd.incr(gram)
    
