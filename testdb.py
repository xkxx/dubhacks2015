import redis
r = redis.StrictRedis()

r.zadd('dear', 30.0, 'Miss ', 20.0, 'Mr. ', 80.0, 'Professor ')
r.zadd('thank you', 15.0, 'in advance', 30.0, 'for your help',
60.0, 'very much')
r.zadd('you', 60.0, 'too', 20.0, 'can')
