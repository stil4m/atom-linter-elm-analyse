module AtomLinter exposing (Message)


type alias Location =
    { file : String
    , position : List ( Int, Int )
    }


type alias Message =
    { severity : String
    , location : Location
    , excerpt : String
    , description : String
    }
